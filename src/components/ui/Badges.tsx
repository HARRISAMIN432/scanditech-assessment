import { cn } from "@/lib/cn";
import type { ReplyStatus, Sentiment } from "@/lib/types";

const STATUS_LABEL: Record<ReplyStatus, string> = {
  pending: "Pending", generated: "Generated", edited: "Edited", approved: "Approved",
};
const SENTIMENT_LABEL: Record<Sentiment, string> = { positive: "Positive", neutral: "Neutral", negative: "Negative" };

export const StatusBadge = ({ status }: { status: ReplyStatus }) => (
  <span className={cn("badge", `badge-status-${status}`)}>{STATUS_LABEL[status]}</span>
);

export const SentimentBadge = ({ sentiment }: { sentiment: Sentiment | null }) =>
  sentiment ? <span className={cn("badge", `badge-${sentiment}`)}>{SENTIMENT_LABEL[sentiment]}</span>
            : <span className="badge badge-muted">Not analysed</span>;

export const LanguageBadge = ({ name }: { name: string | null }) =>
  <span className="badge badge-lang">{name ?? "Language unknown"}</span>;

export function Stars({ rating }: { rating: number | null }) {
  if (rating == null) return <span className="muted text-sm">No rating</span>;
  return (
    <span className="stars" role="img" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => <span key={n} className={n <= rating ? "star-on" : "star-off"}>★</span>)}
    </span>
  );
}
