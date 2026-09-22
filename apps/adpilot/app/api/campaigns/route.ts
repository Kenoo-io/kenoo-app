import { NextResponse } from "next/server";

import {
  CAMPAIGN_SORT_COLUMNS,
  listCampaignPerformance,
  type CampaignEntityType,
  type CampaignSortColumn,
  type CampaignSortDirection,
} from "@/lib/campaigns-server";
import { getAdDataScope } from "@/lib/ad-scope";
import {
  DASHBOARD_OBJECTIVE_BUCKETS,
  type DashboardObjectiveBucket,
} from "@/lib/meta-objectives";

const ENTITY_TYPES = new Set<CampaignEntityType>(["campaign", "ad_group", "ad"]);

const OBJECTIVE_BUCKETS = new Set<DashboardObjectiveBucket>(
  DASHBOARD_OBJECTIVE_BUCKETS.map((bucket) => bucket.value),
);

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
  const entityTypeParam = searchParams.get("type") ?? "campaign";
  const entityType = ENTITY_TYPES.has(entityTypeParam as CampaignEntityType)
    ? (entityTypeParam as CampaignEntityType)
    : "campaign";
  const search = searchParams.get("search") ?? undefined;
  const accountId = searchParams.get("accountId") ?? undefined;
  const objectiveParam = searchParams.get("objective") ?? undefined;
  const objective =
    objectiveParam && OBJECTIVE_BUCKETS.has(objectiveParam as DashboardObjectiveBucket)
      ? (objectiveParam as DashboardObjectiveBucket)
      : undefined;
  const providerParam = searchParams.get("provider") ?? undefined;
  const provider = providerParam === "meta" || providerParam === "google" ? providerParam : undefined;
  const statusParam = searchParams.get("status") ?? undefined;
  const status = statusParam === "active" || statusParam === "paused" ? statusParam : undefined;
  const page = Number(searchParams.get("page") ?? "0");
  const rangeParam = searchParams.get("range") ?? "30d";
  const rangeDays = RANGE_DAYS[rangeParam] ?? 30;
  const sortParam = searchParams.get("sort") ?? undefined;
  const sortBy =
    sortParam && CAMPAIGN_SORT_COLUMNS.has(sortParam as CampaignSortColumn)
      ? (sortParam as CampaignSortColumn)
      : undefined;
  const dirParam = searchParams.get("dir") ?? undefined;
  const sortDirection: CampaignSortDirection | undefined =
    dirParam === "asc" || dirParam === "desc" ? dirParam : undefined;

  try {
    const result = await listCampaignPerformance({
      scope,
      entityType,
      search,
      accountId,
      objective,
    provider,
    status,
      page: Number.isFinite(page) ? page : 0,
      rangeDays,
      sortBy,
      sortDirection,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[adpilot] campaigns list:", error);
    return NextResponse.json({ error: "Failed to load campaigns" }, { status: 500 });
  }
}
