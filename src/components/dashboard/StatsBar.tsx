import { Stars } from "@/components/ui/Badges";
import type { StatsResponse } from "@/lib/types";

export function StatsBar({ data, loading }: { data: StatsResponse | null; loading: boolean }) {
  if (!data) {
    return loading ? (
      <section className="stats-grid" aria-busy="true">
        {[0, 1, 2, 3].map((i) => <div key={i} className="card skeleton skeleton-stat" />)}
      </section>
    ) : null;
  }
  const { stats } = data;
  const sentimentTotal = stats.analyzed || 1;
  const pct = (n: number) => `${(n / sentimentTotal) * 100}%`;
  const approvedPct = stats.total ? Math.round((stats.byStatus.approved / stats.total) * 100) : 0;

  return (
    <section className="stats-grid" aria-label="Summary">
      <div className="card stat">
        <p className="stat-label">Reviews</p>
        <p className="stat-value">{stats.total}</p>
        <p className="stat-hint">{stats.analyzed} analysed</p>
      </div>
      <div className="card stat">
        <p className="stat-label">Average rating</p>
        <p className="stat-value">{stats.averageRating ?? "–"}</p>
        <p className="stat-hint">{stats.averageRating != null ? <Stars rating={Math.round(stats.averageRating)} /> : "No ratings yet"}</p>
      </div>
      <div className="card stat stat-wide">
        <p className="stat-label">Sentiment</p>
        <div className="meter" role="img" aria-label={`${stats.bySentiment.positive} positive, ${stats.bySentiment.neutral} neutral, ${stats.bySentiment.negative} negative`}>
          <span className="meter-pos" style={{ width: pct(stats.bySentiment.positive) }} />
          <span className="meter-neu" style={{ width: pct(stats.bySentiment.neutral) }} />
          <span className="meter-neg" style={{ width: pct(stats.bySentiment.negative) }} />
        </div>
        <p className="legend">
          <span><i className="dot dot-pos" />{stats.bySentiment.positive} positive</span>
          <span><i className="dot dot-neu" />{stats.bySentiment.neutral} neutral</span>
          <span><i className="dot dot-neg" />{stats.bySentiment.negative} negative</span>
        </p>
      </div>
      <div className="card stat stat-wide">
        <p className="stat-label">Reply progress</p>
        <div className="meter" role="progressbar" aria-valuenow={approvedPct} aria-valuemin={0} aria-valuemax={100} aria-label="Replies approved">
          <span className="meter-brand" style={{ width: `${approvedPct}%` }} />
        </div>
        <p className="legend">
          <span><b>{stats.byStatus.approved}</b> approved</span>
          <span>{stats.byStatus.edited} edited</span>
          <span>{stats.byStatus.generated} generated</span>
          <span>{stats.byStatus.pending} pending</span>
        </p>
      </div>
    </section>
  );
}
