"use client";
import { useState } from "react";
import { api, errorMessage } from "@/lib/client/api-client";
import { useToast } from "@/components/ui/Toast";
import type { Review } from "@/lib/types";

export type ReplyBusy = null | "generate" | "regenerate" | "save" | "approve";

/** Business logic for the reply workflow, kept out of the presentational components. */
export function useReplyActions(review: Review, onChange: (r: Review) => void) {
  const toast = useToast();
  const [busy, setBusy] = useState<ReplyBusy>(null);

  async function run(kind: Exclude<ReplyBusy, null>, task: () => Promise<Review>, success: string) {
    setBusy(kind);
    try {
      onChange(await task());
      toast.success(success);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  return {
    busy,
    generate: () => run("generate", () => api.generateReply(review.id), "Reply generated."),
    regenerate: () => run("regenerate", () => api.generateReply(review.id, true), "New reply generated."),
    save: (text: string) => run("save", () => api.saveReply(review.id, text), "Changes saved."),
    approve: (text: string) =>
      run("approve", () => api.approveReply(review.id, text !== review.reply_text ? text : undefined), "Reply approved."),
  };
}
