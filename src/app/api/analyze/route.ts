import { json, route } from "@/lib/http";
import { analyzePending } from "@/lib/services/analysis-service";
import { analyzeBodySchema } from "@/lib/validation";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const POST = route(async (req) => {
  const body = analyzeBodySchema.parse(await req.json().catch(() => ({})));
  return json(await analyzePending(body.ids));
});
