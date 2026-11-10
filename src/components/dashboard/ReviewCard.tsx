import { LanguageBadge, SentimentBadge, Stars, StatusBadge } from "@/components/ui/Badges";
import { ReplyEditor } from "@/components/dashboard/ReplyEditor";
import { formatDate, initials } from "@/lib/format";
import type { Review } from "@/lib/types";

export function ReviewCard({ review, onChange }: { review: Review; onChange: (r: Review) => void }) {
  const date = formatDate(review.reviewed_at);
  return (
    <article className="card review">
      <div className="review-head">
        <span className="avatar" aria-hidden="true">{initials(review.reviewer_name)}</span>
        <div className="min-w-0 grow">
          <h3 className="review-name truncate">{review.reviewer_name ?? "Anonymous reviewer"}</h3>
          <p className="review-meta"><Stars rating={review.rating} />{date && <span className="muted text-sm">{date}</span>}</p>
        </div>
      </div>
      <div className="badges">
        <StatusBadge status={review.reply_status} />
        <SentimentBadge sentiment={review.sentiment} />
        <LanguageBadge name={review.language_name} />
      </div>
      <p className="review-text" lang={review.language_code ?? undefined}>{review.review_text}</p>
      <ReplyEditor review={review} onChange={onChange} />
    </article>
  );
}
