export const REPLY_STATUSES = ["pending", "generated", "edited", "approved"] as const;
export type ReplyStatus = (typeof REPLY_STATUSES)[number];

export const SENTIMENTS = ["positive", "neutral", "negative"] as const;
export type Sentiment = (typeof SENTIMENTS)[number];

export const SORT_KEYS = ["newest", "oldest", "rating_desc", "rating_asc"] as const;
export type SortKey = (typeof SORT_KEYS)[number];

export interface Business {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
}

export interface Review {
  id: string;
  business_id: string;
  external_id: string;
  reviewer_name: string | null;
  rating: number | null;
  review_text: string;
  reviewed_at: string | null;
  language_code: string | null;
  language_name: string | null;
  sentiment: Sentiment | null;
  analyzed_at: string | null;
  ai_reply: string | null;
  reply_text: string | null;
  reply_status: ReplyStatus;
  generation_count: number;
  generated_at: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Stats {
  total: number;
  analyzed: number;
  averageRating: number | null;
  byStatus: Record<ReplyStatus, number>;
  bySentiment: Record<Sentiment | "unanalyzed", number>;
}

export interface LanguageOption {
  code: string;
  name: string;
}

export interface StatsResponse {
  business: Business | null;
  stats: Stats;
  languages: LanguageOption[];
}

export interface ReviewListResponse {
  reviews: Review[];
  total: number;
}

export interface ReviewFilters {
  search: string;
  sentiment: Sentiment | "all";
  status: ReplyStatus | "all";
  language: string; // "all" or ISO code
  sort: SortKey;
}

export const DEFAULT_FILTERS: ReviewFilters = {
  search: "",
  sentiment: "all",
  status: "all",
  language: "all",
  sort: "newest",
};

export interface ImportResult {
  business: Business;
  imported: number;
  skippedDuplicates: number;
  invalid: { index: number; reason: string }[];
}

export interface AnalyzeResult {
  analyzed: number;
  failed: number;
  remaining: number;
}

export const MAX_REPLY_LENGTH = 2000;
