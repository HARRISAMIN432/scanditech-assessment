"use client";
import { useRef, useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Icon, Spinner } from "@/components/ui/Icon";
import { api, errorMessage } from "@/lib/client/api-client";
import { plural } from "@/lib/format";
import type { ImportResult } from "@/lib/types";

interface Props { open: boolean; onClose: () => void; onImported: (r: ImportResult) => void }

export function ImportDialog({ open, onClose, onImported }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [dragging, setDragging] = useState(false);

  function reset() { setFile(null); setError(null); setResult(null); setBusy(false); }
  function close() { reset(); onClose(); }

  function choose(f: File | undefined) {
    setError(null);
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".json")) { setError("Please choose a .json file."); return; }
    setFile(f);
  }

  async function submit() {
    if (!file) return;
    setBusy(true); setError(null);
    try {
      const res = await api.importFile(file);
      setResult(res);
      onImported(res);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onClose={close} title="Import reviews"
      footer={result
        ? <button className="btn btn-primary" onClick={close}>Done</button>
        : <><button className="btn btn-ghost" onClick={close} disabled={busy}>Cancel</button>
            <button className="btn btn-primary" onClick={submit} disabled={!file || busy}>{busy ? <><Spinner />Importing…</> : "Import file"}</button></>}>
      {result ? (
        <div className="stack">
          <p><b>{plural(result.imported, "review")}</b> imported into {result.business.name}.</p>
          {result.skippedDuplicates > 0 && <p className="muted">{plural(result.skippedDuplicates, "review")} were already imported and skipped.</p>}
          {result.invalid.length > 0 && (
            <details className="notice notice-warn" open>
              <summary>{plural(result.invalid.length, "row")} could not be imported</summary>
              <ul className="list">{result.invalid.slice(0, 20).map((i) => <li key={i.index}>Row {i.index}: {i.reason}</li>)}</ul>
            </details>
          )}
          <p className="muted text-sm">Language and sentiment are analysed next. You can start drafting replies right away.</p>
        </div>
      ) : (
        <div className="stack">
          <p className="muted">Upload a JSON file with a <code>reviews</code> array. Existing reviews are never duplicated or overwritten.</p>
          <button type="button" className={dragging ? "dropzone dropzone-active" : "dropzone"} onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); choose(e.dataTransfer.files[0]); }}>
            <Icon name="upload" className="icon icon-lg" />
            <span className="dropzone-title">{file ? file.name : "Choose a file or drop it here"}</span>
            <span className="muted text-sm">{file ? `${(file.size / 1024).toFixed(1)} KB` : "JSON, up to 2 MB"}</span>
          </button>
          <input ref={inputRef} type="file" accept=".json,application/json" hidden onChange={(e) => choose(e.target.files?.[0])} />
          {error && <p className="notice notice-error" role="alert">{error}</p>}
        </div>
      )}
    </Dialog>
  );
}
