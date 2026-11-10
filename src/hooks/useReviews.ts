"use client";
import { useCallback, useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/client/api-client";
import { useDebounce } from "@/hooks/useDebounce";
import { DEFAULT_FILTERS, type Review, type ReviewFilters, type StatsResponse } from "@/lib/types";

const PAGE_SIZE = 20;

/** Owns list + stats state and keeps them in sync with the filters. No UI in here. */
export function useReviews() {
  const [filters, setFilters] = useState<ReviewFilters>(DEFAULT_FILTERS);
  const search = useDebounce(filters.search, 300);

  const [reviews, setReviews] = useState<Review[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [statsRes, setStatsRes] = useState<StatsResponse | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const refreshStats = useCallback(async () => {
    try {
      setStatsRes(await api.stats());
      setStatsError(null);
    } catch (err) {
      setStatsError(errorMessage(err));
    }
  }, []);

  useEffect(() => {
    refreshStats();
  }, [refreshStats, reloadKey]);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);
    api.listReviews({ ...filters, search }, { signal: ctrl.signal })
      .then((res) => { setReviews(res.reviews); setTotal(res.total); })
      .catch((err) => { if (err?.name !== "AbortError") setError(errorMessage(err)); })
      .finally(() => { if (!ctrl.signal.aborted) setLoading(false); });
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.sentiment, filters.status, filters.language, filters.sort, search, reloadKey]);

  const loadMore = useCallback(async () => {
    setLoadingMore(true);
    try {
      const res = await api.listReviews({ ...filters, search }, { offset: reviews.length, limit: PAGE_SIZE });
      setReviews((prev) => [...prev, ...res.reviews.filter((r) => !prev.some((p) => p.id === r.id))]);
      setTotal(res.total);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoadingMore(false);
    }
  }, [filters, search, reviews.length]);

  /** Replace one review in place (after generate/edit/approve) and refresh the counters. */
  const patchReview = useCallback((review: Review) => {
    setReviews((prev) => prev.map((r) => (r.id === review.id ? review : r)));
    refreshStats();
  }, [refreshStats]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  return {
    filters, setFilters, reviews, total, hasMore: reviews.length < total,
    loading, loadingMore, error, statsRes, statsError, loadMore, patchReview, reload, refreshStats,
  };
}
