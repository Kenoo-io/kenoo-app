import { NextResponse } from "next/server";

import { getAdDataScope } from "@/lib/ad-scope";
import {
  AUDIENCE_SORT_COLUMNS,
  listAudiencePerformance,
  type AudienceSortColumn,
  type AudienceSortDirection,
} from "@/lib/audiences-server";
import type { AdAudienceType } from "@/lib/audience-types";

const AUDIENCE_TYPES = new Set<AdAudienceType>([
  "lookalike",
  "interest",
  "custom",
  "behavior",
  "life_event",
  "family_status",
  "industry",
  "income",
  "education",
  "work",
  "relationship",
  "remarketing",
  "similar",
  "in_market",
  "affinity",
  "custom_intent",
  "other",
]);

const RANGE_DAYS: Record<string, number> = {
  "24h": 1,
  "7d": 7,
  "14d": 14,
  "30d": 30,
};

export async function GET(request: Request) {
  const scope = await getAdDataScope();
  if (!scope) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? undefined;
  const typeParam = searchParams.get("type") ?? undefined;
  const audienceType =
    typeParam && AUDIENCE_TYPES.has(typeParam as AdAudienceType)
      ? (typeParam as AdAudienceType)
      : undefined;
  const page = Number(searchParams.get("page") ?? "0");
  const rangeParam = searchParams.get("range") ?? "7d";
  const rangeDays = RANGE_DAYS[rangeParam] ?? 7;
  const sortParam = searchParams.get("sort") ?? undefined;
  const sortBy =
    sortParam && AUDIENCE_SORT_COLUMNS.has(sortParam as AudienceSortColumn)
      ? (sortParam as AudienceSortColumn)
      : undefined;
  const dirParam = searchParams.get("dir") ?? undefined;
  const sortDirection: AudienceSortDirection | undefined =
    dirParam === "asc" || dirParam === "desc" ? dirParam : undefined;

  try {
    const result = await listAudiencePerformance({
      scope,
      search,
      audienceType,
      page: Number.isFinite(page) ? page : 0,
      rangeDays,
      sortBy,
      sortDirection,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[adpilot] audiences list:", error);
    return NextResponse.json({ error: "Failed to load audiences" }, { status: 500 });
  }
}
