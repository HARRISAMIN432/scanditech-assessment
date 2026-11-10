import { api, ApiError, errorMessage } from "@/lib/client/api-client";
import type { Review } from "@/lib/types";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Keeps ~13 requests/minute, under the free-tier limit of most Gemini models. */
const MIN_INTERVAL_MS = 4500;

export interface AnalyzeOutcome { remaining: number; error?: string }

/** Runs the analyse endpoint until nothing is left (or it stops making progress). */
export async function analyzeAllPending(onProgress?: (remaining: number) => void): Promise<AnalyzeOutcome> {
  let remaining = 0;
  try {
    for (let i = 0; i < 50; i++) {
      const res = await api.analyze();
      remaining = res.remaining;
      onProgress?.(remaining);
      if (remaining === 0) return { remaining };
      if (res.analyzed === 0) return { remaining, error: "Some reviews could not be analysed. Try again." };
    }
  } catch (err) {
    return { remaining, error: errorMessage(err) };
  }
  return { remaining };
}

export interface BulkOutcome { done: number; failed: number; total: number; stopped?: string }

/** Generates drafts one at a time with pacing, stopping cleanly on rate limits or cancellation. */
export async function bulkGenerate(
  ids: string[],
  opts: { signal: AbortSignal; onProgress: (p: { done: number; failed: number; total: number }) => void; onReview: (r: Review) => void },
): Promise<BulkOutcome> {
  let done = 0, failed = 0;
  let lastStart = 0;
  for (const id of ids) {
    if (opts.signal.aborted) return { done, failed, total: ids.length, stopped: "Stopped." };
    const wait = lastStart + MIN_INTERVAL_MS - Date.now();
    if (wait > 0) await sleep(wait);
    lastStart = Date.now();
    try {
      opts.onReview(await api.generateReply(id));
      done++;
    } catch (err) {
      failed++;
      if (err instanceof ApiError && (err.code === "AI_RATE_LIMITED" || err.code === "CONFIG_ERROR" || err.status === 0)) {
        opts.onProgress({ done, failed, total: ids.length });
        return { done, failed, total: ids.length, stopped: err.message };
      }
    }
    opts.onProgress({ done, failed, total: ids.length });
  }
  return { done, failed, total: ids.length };
}
