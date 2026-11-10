import { Icon } from "@/components/ui/Icon";
import type { Business } from "@/lib/types";

export function AppHeader({ business, canExport, onImport }: { business: Business | null; canExport: boolean; onImport: () => void }) {
  return (
    <header className="app-header">
      <div className="app-header-inner">
        <div className="min-w-0">
          <p className="app-title">Review Desk</p>
          <p className="app-subtitle truncate">{business ? `${business.name}${business.category ? ` · ${business.category}` : ""}` : "Customer review management"}</p>
        </div>
        <div className="header-actions">
          {canExport && (
            <>
              <a className="btn btn-secondary" href="/api/export?format=csv" download><Icon name="download" /><span className="hide-xs">Export CSV</span><span className="show-xs">CSV</span></a>
              <a className="btn btn-secondary hide-sm" href="/api/export?format=json" download>JSON</a>
            </>
          )}
          <button className="btn btn-primary" onClick={onImport}><Icon name="upload" />Import</button>
        </div>
      </div>
    </header>
  );
}
