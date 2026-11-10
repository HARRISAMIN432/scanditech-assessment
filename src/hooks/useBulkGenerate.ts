"use client";
import { useCallback, useRef, useState } from "react";
import { api, errorMessage } from "@/lib/client/api-client";
import { bulkGenerate } from "@/lib/client/workflows";
import { useToast } from "@/components/ui/Toast";
import { plural } from "@/lib/format";
import type { Review } from "@/lib/types";

export function useBulkGenerate(onReview: (r: Review) => void, onFinished: () => void) {
  const toast = useToast();
  const [progress, setProgress] = useState<{ done: number; failed: number; total: number } | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const start = useCallback(async () => {
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setProgress({ done: 0, failed: 0, total: 0 });
    try {
      const { reviews } = await api.listReviews(
        { search: "", sentiment: "all", status: "pending", language: "all", sort: "newest" }, { limit: 100 });
      if (!reviews.length) { toast.info("No pending reviews to draft."); return; }
      setProgress({ done: 0, failed: 0, total: reviews.length });
      const out = await bulkGenerate(reviews.map((r) => r.id), { signal: ctrl.signal, onProgress: setProgress, onReview });
      const summary = `${plural(out.done, "draft")} generated${out.failed ? `, ${out.failed} failed` : ""}.`;
      if (out.stopped && out.stopped !== "Stopped.") toast.error(`${summary} ${out.stopped}`);
      else toast.success(out.stopped ? `Stopped. ${summary}` : summary);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      abortRef.current = null;
      setProgress(null);
      onFinished();
    }
  }, [onReview, onFinished, toast]);

  const cancel = useCallback(() => abortRef.current?.abort(), []);
  return { running: progress !== null, progress, start, cancel };
}
