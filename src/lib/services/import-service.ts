import "server-only";
import { createHash } from "node:crypto";
import { ValidationError } from "@/lib/errors";
import * as repo from "@/lib/repositories/reviews";
import { importFileSchema, importReviewSchema } from "@/lib/validation";
import type { ImportResult } from "@/lib/types";

const fallbackId = (r: { reviewer_name: string | null; created_at: string | null; review_text: string }) =>
  "auto-" + createHash("sha1").update(`${r.reviewer_name}|${r.created_at}|${r.review_text}`).digest("hex").slice(0, 16);

/**
 * Validates the uploaded JSON row by row: valid rows are imported, broken rows are reported back.
 * Re-importing the same file is safe (rows are matched on the file's review id and skipped).
 */
export async function importReviews(raw: unknown): Promise<ImportResult> {
  const file = importFileSchema.safeParse(raw);
  if (!file.success) {
    throw new ValidationError(
      "The file is not in the expected format. " + file.error.issues.map((i) => i.message).join("; "),
    );
  }

  const invalid: ImportResult["invalid"] = [];
  const valid: { external_id: string; reviewer_name: string | null; rating: number | null; review_text: string; reviewed_at: string | null }[] = [];
  const seen = new Set<string>();

  file.data.reviews.forEach((item, index) => {
    const parsed = importReviewSchema.safeParse(item);
    if (!parsed.success) {
      invalid.push({ index: index + 1, reason: parsed.error.issues.map((i) => i.message).join("; ") });
      return;
    }
    const r = parsed.data;
    const external_id = r.id ?? fallbackId(r);
    if (seen.has(external_id)) {
      invalid.push({ index: index + 1, reason: `Duplicate id "${external_id}" inside the file` });
      return;
    }
    seen.add(external_id);
    valid.push({ external_id, reviewer_name: r.reviewer_name, rating: r.rating, review_text: r.review_text, reviewed_at: r.created_at });
  });

  if (valid.length === 0) {
    throw new ValidationError("No valid reviews were found in the file.", { invalid: invalid.slice(0, 20) });
  }

  const meta = file.data.business;
  const business = await repo.upsertBusiness({
    name: meta?.name ?? "Imported business",
    category: meta?.category,
    description: meta?.description,
  });

  const existing = await repo.findExistingExternalIds(business.id, valid.map((v) => v.external_id));
  const fresh = valid.filter((v) => !existing.has(v.external_id));
  await repo.insertReviews(fresh.map((v) => ({ ...v, business_id: business.id })));

  return { business, imported: fresh.length, skippedDuplicates: valid.length - fresh.length, invalid };
}
