import type {
  AnalyzeResult, ImportResult, Review, ReviewFilters, ReviewListResponse, StatsResponse,
} from "@/lib/types";

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { cache: "no-store", ...init });
  } catch (err) {
    if ((err as Error).name === "AbortError") throw err;
    throw new ApiError(0, "NETWORK_ERROR", "Network error. Check your connection and try again.");
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(res.status, data?.error?.code ?? "ERROR", data?.error?.message ?? `Request failed (${res.status}).`);
  }
  return data as T;
}

const jsonInit = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const errorMessage = (err: unknown) => (err instanceof Error ? err.message : "Something went wrong.");

export const api = {
  stats: (signal?: AbortSignal) => request<StatsResponse>("/api/stats", { signal }),

  listReviews(filters: ReviewFilters, opts: { offset?: number; limit?: number; signal?: AbortSignal } = {}) {
    const p = new URLSearchParams();
    if (filters.search.trim()) p.set("search", filters.search.trim());
    if (filters.sentiment !== "all") p.set("sentiment", filters.sentiment);
    if (filters.status !== "all") p.set("status", filters.status);
    if (filters.language !== "all") p.set("language", filters.language);
    p.set("sort", filters.sort);
    p.set("limit", String(opts.limit ?? 20));
    p.set("offset", String(opts.offset ?? 0));
    return request<ReviewListResponse>(`/api/reviews?${p}`, { signal: opts.signal });
  },

  importFile(file: File) {
    const form = new FormData();
    form.append("file", file);
    return request<ImportResult>("/api/import", { method: "POST", body: form });
  },

  analyze: () => request<AnalyzeResult>("/api/analyze", jsonInit("POST", {})),

  generateReply: (id: string, regenerate = false) =>
    request<{ review: Review }>(`/api/reviews/${id}/generate`, jsonInit("POST", { regenerate })).then((r) => r.review),

  saveReply: (id: string, reply_text: string) =>
    request<{ review: Review }>(`/api/reviews/${id}`, jsonInit("PATCH", { action: "save", reply_text })).then((r) => r.review),

  approveReply: (id: string, reply_text?: string) =>
    request<{ review: Review }>(`/api/reviews/${id}`, jsonInit("PATCH", { action: "approve", reply_text })).then((r) => r.review),
};
