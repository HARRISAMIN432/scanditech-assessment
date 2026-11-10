import { json, route } from "@/lib/http";
import { approveReply, saveReply } from "@/lib/services/review-service";
import { idSchema, patchReviewSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export const PATCH = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const id = idSchema.parse((await params).id);
  const body = patchReviewSchema.parse(await req.json().catch(() => null));
  const review = body.action === "approve" ? await approveReply(id, body.reply_text) : await saveReply(id, body.reply_text);
  return json({ review });
});
