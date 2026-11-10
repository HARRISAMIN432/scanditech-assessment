import { NextResponse } from "next/server";
import { route } from "@/lib/http";
import * as repo from "@/lib/repositories/reviews";
import { NotFoundError, ValidationError } from "@/lib/errors";

export const dynamic = "force-dynamic";

const COLUMNS = [
  "external_id", "reviewer_name", "rating", "reviewed_at", "review_text", "language_code", "sentiment",
  "reply_status", "reply_text", "ai_reply", "generation_count", "approved_at",
] as const;

/** Neutralises spreadsheet formulas (=, +, -, @) and quotes values that need it. */
function csvCell(value: unknown): string {
  if (value == null) return "";
  let s = String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export const GET = route(async (req) => {
  const format = req.nextUrl.searchParams.get("format") ?? "csv";
  if (format !== "csv" && format !== "json") throw new ValidationError("format must be csv or json");
  const business = await repo.getLatestBusiness();
  if (!business) throw new NotFoundError("Business");
  const rows = await repo.getAllForExport(business.id);
  const stamp = new Date().toISOString().slice(0, 10);

  if (format === "json") {
    const data = rows.map((r) => Object.fromEntries(COLUMNS.map((c) => [c, r[c]])));
    return new NextResponse(JSON.stringify({ business: business.name, reviews: data }, null, 2), {
      headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="reviews-${stamp}.json"` },
    });
  }
  const csv = [COLUMNS.join(","), ...rows.map((r) => COLUMNS.map((c) => csvCell(r[c])).join(","))].join("\r\n");
  return new NextResponse("\uFEFF" + csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="reviews-${stamp}.csv"` },
  });
});
