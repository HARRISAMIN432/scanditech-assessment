import "server-only";
import { getSupabase } from "@/lib/supabase/server";
import { DatabaseError } from "@/lib/errors";
import type {
  Business, LanguageOption, ReplyStatus, Review, Sentiment, SortKey, Stats,
} from "@/lib/types";

type DbResult<T> = { data: T | null; error: { message: string } | null };
function unwrap<T>(res: DbResult<T>, ctx: string): T | null {
  if (res.error) throw new DatabaseError(`${ctx}: ${res.error.message}`);
  return res.data;
}
const chunk = <T,>(items: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
};

// ---- businesses -----------------------------------------------------------

export async function upsertBusiness(input: { name: string; category?: string | null; description?: string | null }): Promise<Business> {
  const res = await getSupabase()
    .from("businesses")
    .upsert(
      { name: input.name, category: input.category ?? null, description: input.description ?? null },
      { onConflict: "name" },
    )
    .select()
    .single();
  return unwrap(res as DbResult<Business>, "Saving business")!;
}

export async function getBusiness(id: string): Promise<Business | null> {
  const res = await getSupabase().from("businesses").select("*").eq("id", id).maybeSingle();
  return unwrap(res as DbResult<Business>, "Loading business");
}

export async function getLatestBusiness(): Promise<Business | null> {
  const res = await getSupabase().from("businesses").select("*").order("created_at", { ascending: false }).limit(1).maybeSingle();
  return unwrap(res as DbResult<Business>, "Loading business");
}

// ---- reviews: import ------------------------------------------------------

export interface NewReview {
  business_id: string;
  external_id: string;
  reviewer_name: string | null;
  rating: number | null;
  review_text: string;
  reviewed_at: string | null;
}

export async function findExistingExternalIds(businessId: string, externalIds: string[]): Promise<Set<string>> {
  const found = new Set<string>();
  for (const ids of chunk(externalIds, 100)) {
    const res = await getSupabase().from("reviews").select("external_id").eq("business_id", businessId).in("external_id", ids);
    for (const row of unwrap(res as DbResult<{ external_id: string }[]>, "Checking duplicates") ?? []) found.add(row.external_id);
  }
  return found;
}

export async function insertReviews(rows: NewReview[]): Promise<void> {
  for (const part of chunk(rows, 200)) {
    const res = await getSupabase().from("reviews").insert(part);
    unwrap(res as DbResult<unknown>, "Inserting reviews");
  }
}

// ---- reviews: read --------------------------------------------------------

export interface ListParams {
  businessId: string;
  search?: string;
  sentiment?: Sentiment;
  status?: ReplyStatus;
  language?: string;
  sort?: SortKey;
  limit: number;
  offset: number;
}

/** Removes characters that are special in PostgREST filters or LIKE patterns. */
const sanitizeSearch = (s: string) => s.replace(/[%_,()*\\"']/g, " ").replace(/\s+/g, " ").trim();

export async function listReviews(p: ListParams): Promise<{ rows: Review[]; total: number }> {
  let q = getSupabase().from("reviews").select("*", { count: "exact" }).eq("business_id", p.businessId);
  if (p.sentiment) q = q.eq("sentiment", p.sentiment);
  if (p.status) q = q.eq("reply_status", p.status);
  if (p.language) q = q.eq("language_code", p.language);
  const term = p.search ? sanitizeSearch(p.search) : "";
  if (term) q = q.or(`review_text.ilike.%${term}%,reviewer_name.ilike.%${term}%`);

  switch (p.sort) {
    case "oldest": q = q.order("reviewed_at", { ascending: true, nullsFirst: false }); break;
    case "rating_desc": q = q.order("rating", { ascending: false, nullsFirst: false }); break;
    case "rating_asc": q = q.order("rating", { ascending: true, nullsFirst: false }); break;
    default: q = q.order("reviewed_at", { ascending: false, nullsFirst: false });
  }
  q = q.order("created_at", { ascending: false }).order("id").range(p.offset, p.offset + p.limit - 1);

  const res = await q;
  if (res.error) throw new DatabaseError(`Listing reviews: ${res.error.message}`);
  return { rows: (res.data ?? []) as Review[], total: res.count ?? 0 };
}

export async function getReview(id: string): Promise<Review | null> {
  const res = await getSupabase().from("reviews").select("*").eq("id", id).maybeSingle();
  return unwrap(res as DbResult<Review>, "Loading review");
}

export async function getAllForExport(businessId: string): Promise<Review[]> {
  const out: Review[] = [];
  for (let from = 0; ; from += 1000) {
    const res = await getSupabase().from("reviews").select("*").eq("business_id", businessId)
      .order("reviewed_at", { ascending: false, nullsFirst: false }).order("id").range(from, from + 999);
    const rows = (unwrap(res as DbResult<Review[]>, "Exporting reviews") ?? []) as Review[];
    out.push(...rows);
    if (rows.length < 1000) break;
  }
  return out;
}

/** Reviews that have not been analysed yet (optionally limited to specific ids). */
export async function getUnanalyzed(businessId: string, limit: number, ids?: string[]): Promise<Review[]> {
  let q = getSupabase().from("reviews").select("*").eq("business_id", businessId).is("language_code", null).order("created_at").limit(limit);
  if (ids?.length) q = q.in("id", ids);
  return (unwrap((await q) as DbResult<Review[]>, "Loading unanalysed reviews") ?? []) as Review[];
}

export async function countUnanalyzed(businessId: string): Promise<number> {
  const res = await getSupabase().from("reviews").select("id", { count: "exact", head: true }).eq("business_id", businessId).is("language_code", null);
  if (res.error) throw new DatabaseError(`Counting reviews: ${res.error.message}`);
  return res.count ?? 0;
}

export async function getStats(businessId: string): Promise<{ stats: Stats; languages: LanguageOption[] }> {
  type Row = Pick<Review, "reply_status" | "sentiment" | "rating" | "language_code" | "language_name">;
  const rows: Row[] = [];
  for (let from = 0; from < 20000; from += 1000) {
    const res = await getSupabase().from("reviews").select("reply_status,sentiment,rating,language_code,language_name")
      .eq("business_id", businessId).order("id").range(from, from + 999);
    const part = (unwrap(res as DbResult<Row[]>, "Loading stats") ?? []) as Row[];
    rows.push(...part);
    if (part.length < 1000) break;
  }

  const stats: Stats = {
    total: rows.length,
    analyzed: 0,
    averageRating: null,
    byStatus: { pending: 0, generated: 0, edited: 0, approved: 0 },
    bySentiment: { positive: 0, neutral: 0, negative: 0, unanalyzed: 0 },
  };
  let ratingSum = 0, ratingCount = 0;
  const languages = new Map<string, string>();
  for (const r of rows) {
    stats.byStatus[r.reply_status] += 1;
    if (r.sentiment) { stats.bySentiment[r.sentiment] += 1; stats.analyzed += 1; } else stats.bySentiment.unanalyzed += 1;
    if (r.rating != null) { ratingSum += r.rating; ratingCount += 1; }
    if (r.language_code) languages.set(r.language_code, r.language_name ?? r.language_code);
  }
  if (ratingCount) stats.averageRating = Math.round((ratingSum / ratingCount) * 10) / 10;
  return {
    stats,
    languages: [...languages].map(([code, name]) => ({ code, name })).sort((a, b) => a.name.localeCompare(b.name)),
  };
}

// ---- reviews: write -------------------------------------------------------

export type ReviewPatch = Partial<Pick<Review,
  "language_code" | "language_name" | "sentiment" | "analyzed_at" | "ai_reply" | "reply_text" |
  "reply_status" | "generation_count" | "generated_at" | "approved_at">>;

export async function updateReview(id: string, patch: ReviewPatch): Promise<Review> {
  const res = await getSupabase().from("reviews").update(patch).eq("id", id).select().single();
  return unwrap(res as DbResult<Review>, "Updating review")!;
}
