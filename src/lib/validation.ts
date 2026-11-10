import { z } from "zod";
import { MAX_REPLY_LENGTH, REPLY_STATUSES, SENTIMENTS, SORT_KEYS } from "@/lib/types";

// ---- JSON import ----------------------------------------------------------

export const MAX_IMPORT_BYTES = 2 * 1024 * 1024;
export const MAX_IMPORT_REVIEWS = 1000;

const optionalText = (max: number) =>
  z.string().trim().max(max).nullish().transform((v) => (v ? v : null));

export const importFileSchema = z.object({
  business: z.object({
    name: z.string().trim().min(1, "business.name is required").max(200),
    category: optionalText(100),
    description: optionalText(1000),
  }).optional(),
  reviews: z.array(z.unknown(), { required_error: "'reviews' must be an array", invalid_type_error: "'reviews' must be an array" })
    .min(1, "The file contains no reviews")
    .max(MAX_IMPORT_REVIEWS, `At most ${MAX_IMPORT_REVIEWS} reviews can be imported at once`),
});

export const importReviewSchema = z.object({
  id: z.union([z.string(), z.number()]).nullish().transform((v) => (v == null || String(v).trim() === "" ? null : String(v).trim())),
  reviewer_name: optionalText(200),
  rating: z.number().int("rating must be a whole number").min(1, "rating must be 1-5").max(5, "rating must be 1-5").nullish().transform((v) => v ?? null),
  created_at: z.string().trim().nullish()
    .refine((v) => !v || !Number.isNaN(Date.parse(v)), "created_at is not a valid date")
    .transform((v) => (v ? new Date(v).toISOString() : null)),
  review_text: z.string({ required_error: "review_text is required", invalid_type_error: "review_text must be text" })
    .trim().min(1, "review_text is empty").max(5000, "review_text is longer than 5000 characters"),
});

// ---- query / body schemas -------------------------------------------------

export const listQuerySchema = z.object({
  search: z.string().trim().max(200).optional(),
  sentiment: z.enum(SENTIMENTS).optional(),
  status: z.enum(REPLY_STATUSES).optional(),
  language: z.string().trim().min(2).max(12).optional(),
  sort: z.enum(SORT_KEYS).default("newest"),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const replyText = z.string().trim().min(1, "The reply cannot be empty").max(MAX_REPLY_LENGTH, `The reply is limited to ${MAX_REPLY_LENGTH} characters`);

export const patchReviewSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("save"), reply_text: replyText }),
  z.object({ action: z.literal("approve"), reply_text: replyText.optional() }),
]);

export const generateBodySchema = z.object({ regenerate: z.boolean().optional() }).default({});
export const analyzeBodySchema = z.object({ ids: z.array(z.string().uuid()).max(50).optional() }).default({});
export const idSchema = z.string().uuid("Invalid review id");
