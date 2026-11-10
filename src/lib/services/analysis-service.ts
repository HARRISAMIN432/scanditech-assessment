import "server-only";
import { analyzeReviews } from "@/lib/ai/analyze";
import * as repo from "@/lib/repositories/reviews";
import type { AnalyzeResult } from "@/lib/types";

const BATCH_SIZE = 16;

/** Analyses one batch of not-yet-analysed reviews and reports how many are left. */
export async function analyzePending(ids?: string[]): Promise<AnalyzeResult> {
  const business = await repo.getLatestBusiness();
  if (!business) return { analyzed: 0, failed: 0, remaining: 0 };

  const batch = await repo.getUnanalyzed(business.id, BATCH_SIZE, ids);
  if (batch.length === 0) return { analyzed: 0, failed: 0, remaining: await repo.countUnanalyzed(business.id) };

  const results = await analyzeReviews(batch.map((r) => ({ id: r.id, text: r.review_text, rating: r.rating })));
  const now = new Date().toISOString();
  await Promise.all(results.map((r) =>
    repo.updateReview(r.id, { language_code: r.languageCode, language_name: r.languageName, sentiment: r.sentiment, analyzed_at: now })));

  return {
    analyzed: results.length,
    failed: batch.length - results.length,
    remaining: await repo.countUnanalyzed(business.id),
  };
}
