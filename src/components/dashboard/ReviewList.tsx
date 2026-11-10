import { ReviewCard } from "@/components/dashboard/ReviewCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Icon";
import type { Review } from "@/lib/types";

interface Props {
  reviews: Review[]; loading: boolean; error: string | null; hasMore: boolean; loadingMore: boolean; filtered: boolean;
  onChange: (r: Review) => void; onLoadMore: () => void; onRetry: () => void;
}

export function ReviewList({ reviews, loading, error, hasMore, loadingMore, filtered, onChange, onLoadMore, onRetry }: Props) {
  if (loading) {
    return (
      <div className="review-list" aria-busy="true">
        {[0, 1, 2].map((i) => <div key={i} className="card skeleton skeleton-card" />)}
      </div>
    );
  }
  if (error) {
    return <EmptyState icon="x" title="Could not load reviews" action={<button className="btn btn-secondary" onClick={onRetry}>Try again</button>}>{error}</EmptyState>;
  }
  if (!reviews.length) {
    return <EmptyState icon="search" title={filtered ? "No reviews match your filters" : "No reviews yet"}>
      {filtered ? "Try a different search or clear the filters." : "Import a JSON file to get started."}</EmptyState>;
  }
  return (
    <>
      <div className="review-list">{reviews.map((r) => <ReviewCard key={r.id} review={r} onChange={onChange} />)}</div>
      {hasMore && (
        <div className="center">
          <button className="btn btn-secondary" onClick={onLoadMore} disabled={loadingMore}>{loadingMore ? <><Spinner />Loading…</> : "Load more reviews"}</button>
        </div>
      )}
    </>
  );
}
