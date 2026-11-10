import { Icon } from "@/components/ui/Icon";
import { DEFAULT_FILTERS, REPLY_STATUSES, SENTIMENTS, type LanguageOption, type ReviewFilters, type SortKey } from "@/lib/types";

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
const SORTS: { value: SortKey; label: string }[] = [
  { value: "newest", label: "Newest first" }, { value: "oldest", label: "Oldest first" },
  { value: "rating_desc", label: "Highest rating" }, { value: "rating_asc", label: "Lowest rating" },
];

interface Props { filters: ReviewFilters; onChange: (f: ReviewFilters) => void; languages: LanguageOption[]; shown: number; total: number }

export function ReviewToolbar({ filters, onChange, languages, shown, total }: Props) {
  const set = <K extends keyof ReviewFilters>(key: K, value: ReviewFilters[K]) => onChange({ ...filters, [key]: value });
  const active = JSON.stringify(filters) !== JSON.stringify(DEFAULT_FILTERS);

  return (
    <section className="toolbar" aria-label="Search and filters">
      <div className="search">
        <Icon name="search" className="icon search-icon" />
        <input className="input input-search" type="search" placeholder="Search reviews or reviewer names" aria-label="Search reviews"
          value={filters.search} onChange={(e) => set("search", e.target.value)} />
      </div>
      <div className="filter-grid">
        <label className="field"><span className="field-label">Sentiment</span>
          <select className="select" value={filters.sentiment} onChange={(e) => set("sentiment", e.target.value as ReviewFilters["sentiment"])}>
            <option value="all">All sentiments</option>
            {SENTIMENTS.map((s) => <option key={s} value={s}>{cap(s)}</option>)}
          </select></label>
        <label className="field"><span className="field-label">Reply status</span>
          <select className="select" value={filters.status} onChange={(e) => set("status", e.target.value as ReviewFilters["status"])}>
            <option value="all">All statuses</option>
            {REPLY_STATUSES.map((s) => <option key={s} value={s}>{cap(s)}</option>)}
          </select></label>
        <label className="field"><span className="field-label">Language</span>
          <select className="select" value={filters.language} onChange={(e) => set("language", e.target.value)}>
            <option value="all">All languages</option>
            {languages.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
          </select></label>
        <label className="field"><span className="field-label">Sort by</span>
          <select className="select" value={filters.sort} onChange={(e) => set("sort", e.target.value as SortKey)}>
            {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select></label>
      </div>
      <div className="toolbar-foot">
        <p className="muted text-sm" aria-live="polite">Showing {shown} of {total} {total === 1 ? "review" : "reviews"}</p>
        {active && <button className="btn btn-ghost btn-sm" onClick={() => onChange(DEFAULT_FILTERS)}><Icon name="x" />Clear filters</button>}
      </div>
    </section>
  );
}
