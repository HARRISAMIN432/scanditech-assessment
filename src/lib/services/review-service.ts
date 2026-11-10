import "server-only";
import { generateReply } from "@/lib/ai/reply";
import { NotFoundError, ValidationError } from "@/lib/errors";
import * as repo from "@/lib/repositories/reviews";
import type { Review } from "@/lib/types";

async function requireReview(id: string): Promise<Review> {
  const review = await repo.getReview(id);
  if (!review) throw new NotFoundError("Review");
  return review;
}

/**
 * Generates a reply (and fills in language/sentiment if they are missing).
 * Never calls the AI again for a review that already has a draft unless `regenerate` is set.
 */
export async function generateReplyFor(id: string, opts: { regenerate?: boolean } = {}): Promise<Review> {
  const review = await requireReview(id);
  if (review.ai_reply && !opts.regenerate) return review;

  const business = await repo.getBusiness(review.business_id);
  if (!business) throw new NotFoundError("Business");

  const out = await generateReply({ business, review, previousReply: opts.regenerate ? review.ai_reply : null });
  const analysed = review.language_code && review.sentiment;
  return repo.updateReview(id, {
    ...(analysed ? {} : {
      language_code: out.languageCode, language_name: out.languageName, sentiment: out.sentiment,
      analyzed_at: new Date().toISOString(),
    }),
    ai_reply: out.reply,
    reply_text: out.reply,
    reply_status: "generated",
    generation_count: review.generation_count + 1,
    generated_at: new Date().toISOString(),
    approved_at: null,
  });
}

/** Saves the user's wording. Status becomes "edited" unless the text still equals the AI draft. */
export async function saveReply(id: string, text: string): Promise<Review> {
  const review = await requireReview(id);
  const status = review.ai_reply && text === review.ai_reply ? "generated" : "edited";
  return repo.updateReview(id, { reply_text: text, reply_status: status, approved_at: null });
}

/** Approves the reply (optionally saving a last edit in the same step). */
export async function approveReply(id: string, text?: string): Promise<Review> {
  const review = await requireReview(id);
  const finalText = (text ?? review.reply_text ?? "").trim();
  if (!finalText) throw new ValidationError("Generate or write a reply before approving it.");
  return repo.updateReview(id, { reply_text: finalText, reply_status: "approved", approved_at: new Date().toISOString() });
}
