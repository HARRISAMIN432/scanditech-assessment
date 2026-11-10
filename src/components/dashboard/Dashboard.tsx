"use client";
import { useCallback, useState } from "react";
import { AppHeader } from "@/components/dashboard/AppHeader";
import { BulkBar } from "@/components/dashboard/BulkBar";
import { ImportDialog } from "@/components/dashboard/ImportDialog";
import { ReviewList } from "@/components/dashboard/ReviewList";
import { ReviewToolbar } from "@/components/dashboard/ReviewToolbar";
import { StatsBar } from "@/components/dashboard/StatsBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { useBulkGenerate } from "@/hooks/useBulkGenerate";
import { useReviews } from "@/hooks/useReviews";
import { analyzeAllPending } from "@/lib/client/workflows";
import { DEFAULT_FILTERS, type ImportResult } from "@/lib/types";

export default function Dashboard() {
  const toast = useToast();
  const data = useReviews();
  const { reload, refreshStats, patchReview, statsRes } = data;
  const [importOpen, setImportOpen] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  const runAnalysis = useCallback(async () => {
    setAnalyzing(true);
    const out = await analyzeAllPending(() => refreshStats());
    setAnalyzing(false);
    if (out.error) toast.error(out.error);
    reload();
  }, [refreshStats, reload, toast]);

  const handleImported = useCallback((res: ImportResult) => {
    toast.success(`${res.imported} imported${res.skippedDuplicates ? `, ${res.skippedDuplicates} already existed` : ""}.`);
    reload();
    if (res.imported > 0) runAnalysis();
  }, [reload, runAnalysis, toast]);

  const bulk = useBulkGenerate(patchReview, reload);

  const stats = statsRes?.stats;
  const hasData = (stats?.total ?? 0) > 0;
  const filtered = JSON.stringify(data.filters) !== JSON.stringify(DEFAULT_FILTERS);

  return (
    <div className="app">
      <AppHeader business={statsRes?.business ?? null} canExport={hasData} onImport={() => setImportOpen(true)} />
      <main className="page">
        {data.statsError && !statsRes ? (
          <EmptyState icon="x" title="The app is not connected yet" action={<button className="btn btn-secondary" onClick={reload}>Try again</button>}>{data.statsError}</EmptyState>
        ) : !hasData && statsRes ? (
          <EmptyState title="No reviews imported yet" action={<button className="btn btn-primary" onClick={() => setImportOpen(true)}>Import reviews</button>}>
            Import your reviews JSON to see them here, analyse them and draft replies.
          </EmptyState>
        ) : (
          <>
            <StatsBar data={statsRes} loading={!data.statsError} />
            {stats && (
              <BulkBar unanalyzed={stats.bySentiment.unanalyzed} pending={stats.byStatus.pending} analyzing={analyzing}
                bulk={bulk} onAnalyze={runAnalysis} />
            )}
            <ReviewToolbar filters={data.filters} onChange={data.setFilters} languages={statsRes?.languages ?? []}
              shown={data.reviews.length} total={data.total} />
            <ReviewList reviews={data.reviews} loading={data.loading} error={data.error} hasMore={data.hasMore}
              loadingMore={data.loadingMore} filtered={filtered} onChange={patchReview} onLoadMore={data.loadMore} onRetry={reload} />
          </>
        )}
      </main>
      <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} onImported={handleImported} />
    </div>
  );
}
