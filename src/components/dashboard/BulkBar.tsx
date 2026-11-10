import { Icon, Spinner } from "@/components/ui/Icon";
import { plural } from "@/lib/format";

interface Props {
  unanalyzed: number; pending: number; analyzing: boolean;
  bulk: { running: boolean; progress: { done: number; failed: number; total: number } | null; start: () => void; cancel: () => void };
  onAnalyze: () => void;
}

export function BulkBar({ unanalyzed, pending, analyzing, bulk, onAnalyze }: Props) {
  if (!analyzing && !bulk.running && !unanalyzed && !pending) return null;
  const p = bulk.progress;
  return (
    <section className="card bulk" aria-live="polite">
      {bulk.running ? (
        <>
          <p className="bulk-text"><Spinner />Drafting replies{p && p.total ? `: ${p.done + p.failed} of ${p.total}` : "…"}. Replies are paced to stay within the free AI limit.</p>
          <button className="btn btn-secondary btn-sm" onClick={bulk.cancel}>Stop</button>
        </>
      ) : analyzing ? (
        <p className="bulk-text"><Spinner />Analysing language and sentiment…</p>
      ) : (
        <>
          <p className="bulk-text">
            {unanalyzed > 0 && <>{plural(unanalyzed, "review")} not analysed yet. </>}
            {pending > 0 && <>{plural(pending, "review")} waiting for a reply.</>}
          </p>
          <div className="actions">
            {unanalyzed > 0 && <button className="btn btn-secondary btn-sm" onClick={onAnalyze}>Analyse reviews</button>}
            {pending > 0 && <button className="btn btn-primary btn-sm" onClick={bulk.start}><Icon name="sparkle" />Draft all pending</button>}
          </div>
        </>
      )}
    </section>
  );
}
