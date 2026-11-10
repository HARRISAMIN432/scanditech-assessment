"use client";
import { useEffect, useState } from "react";
import { Icon, Spinner } from "@/components/ui/Icon";
import { useReplyActions } from "@/hooks/useReplyActions";
import { formatDate } from "@/lib/format";
import { MAX_REPLY_LENGTH, type Review } from "@/lib/types";

export function ReplyEditor({ review, onChange }: { review: Review; onChange: (r: Review) => void }) {
  const { busy, generate, regenerate, save, approve } = useReplyActions(review, onChange);
  const [draft, setDraft] = useState(review.reply_text ?? "");
  const [editing, setEditing] = useState(false);

  // Whenever the stored reply changes (generate, save, approve) the editor resets to it.
  useEffect(() => {
    setDraft(review.reply_text ?? "");
    setEditing(false);
  }, [review.reply_text, review.reply_status]);

  const dirty = draft.trim() !== (review.reply_text ?? "").trim();
  const disabled = busy !== null;
  const approved = review.reply_status === "approved";
  const label = (kind: typeof busy, idle: string, working: string) => (busy === kind ? <><Spinner />{working}</> : idle);

  function onRegenerate() {
    const needsConfirm = dirty || review.reply_status === "edited" || approved;
    if (needsConfirm && !window.confirm("Replace the current reply with a new AI draft?")) return;
    regenerate();
  }

  if (!review.reply_text) {
    return (
      <div className="reply reply-empty">
        <p className="muted text-sm">No reply yet. The AI will write one in {review.language_name ?? "the review's language"}.</p>
        <button className="btn btn-primary" onClick={generate} disabled={disabled}>
          {busy === "generate" ? <><Spinner />Generating…</> : <><Icon name="sparkle" />Generate reply</>}
        </button>
      </div>
    );
  }

  if (approved && !editing) {
    return (
      <div className="reply reply-approved">
        <p className="reply-label"><Icon name="check" />Approved reply{formatDate(review.approved_at) ? ` · ${formatDate(review.approved_at)}` : ""}</p>
        <p className="reply-text" lang={review.language_code ?? undefined}>{review.reply_text}</p>
        <div className="actions">
          <button className="btn btn-secondary" onClick={() => setEditing(true)} disabled={disabled}><Icon name="pencil" />Edit</button>
          <button className="btn btn-ghost" onClick={onRegenerate} disabled={disabled}>
            {busy === "regenerate" ? <><Spinner />Regenerating…</> : <><Icon name="refresh" />Regenerate</>}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="reply">
      <label className="reply-label" htmlFor={`reply-${review.id}`}>
        {review.reply_status === "edited" ? "Your edited reply" : "Suggested reply"}
        {review.language_name ? ` · ${review.language_name}` : ""}
      </label>
      <textarea id={`reply-${review.id}`} className="textarea" lang={review.language_code ?? undefined}
        rows={Math.min(10, Math.max(4, Math.ceil(draft.length / 55)))} value={draft} maxLength={MAX_REPLY_LENGTH}
        onChange={(e) => setDraft(e.target.value)} disabled={disabled} />
      <div className="reply-meta">
        <span className={draft.length > MAX_REPLY_LENGTH * 0.9 ? "text-warn" : "muted"}>{draft.length}/{MAX_REPLY_LENGTH}</span>
        {dirty && <span className="muted">Unsaved changes</span>}
      </div>
      <div className="actions">
        <button className="btn btn-primary" onClick={() => approve(draft.trim())} disabled={disabled || !draft.trim()}>
          {label("approve", "Approve reply", "Approving…")}
        </button>
        <button className="btn btn-secondary" onClick={() => save(draft.trim())} disabled={disabled || !dirty || !draft.trim()}>
          {label("save", "Save changes", "Saving…")}
        </button>
        <button className="btn btn-ghost" onClick={onRegenerate} disabled={disabled}>
          {busy === "regenerate" ? <><Spinner />Regenerating…</> : <><Icon name="refresh" />Regenerate</>}
        </button>
        {approved && editing && <button className="btn btn-ghost" onClick={() => { setEditing(false); setDraft(review.reply_text ?? ""); }} disabled={disabled}>Cancel</button>}
      </div>
    </div>
  );
}
