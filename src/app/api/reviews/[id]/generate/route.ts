import { json, route } from "@/lib/http";
import { generateReplyFor } from "@/lib/services/review-service";
import { generateBodySchema, idSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const POST = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const id = idSchema.parse((await params).id);
  const body = generateBodySchema.parse(await req.json().catch(() => ({})));
  const review = await generateReplyFor(id, { regenerate: body.regenerate });
  return json({ review });
});
