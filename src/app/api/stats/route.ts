import { json, route } from "@/lib/http";
import * as repo from "@/lib/repositories/reviews";
import type { StatsResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const business = await repo.getLatestBusiness();
  if (!business) {
    const empty: StatsResponse = {
      business: null, languages: [],
      stats: {
        total: 0, analyzed: 0, averageRating: null,
        byStatus: { pending: 0, generated: 0, edited: 0, approved: 0 },
        bySentiment: { positive: 0, neutral: 0, negative: 0, unanalyzed: 0 },
      },
    };
    return json(empty);
  }
  const { stats, languages } = await repo.getStats(business.id);
  return json<StatsResponse>({ business, stats, languages });
});
