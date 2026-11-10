import { json, route } from "@/lib/http";
import * as repo from "@/lib/repositories/reviews";
import { listQuerySchema } from "@/lib/validation";
import type { ReviewListResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

export const GET = route(async (req) => {
  const q = listQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams));
  const business = await repo.getLatestBusiness();
  if (!business) return json<ReviewListResponse>({ reviews: [], total: 0 });
  const { rows, total } = await repo.listReviews({ ...q, businessId: business.id });
  return json<ReviewListResponse>({ reviews: rows, total });
});
