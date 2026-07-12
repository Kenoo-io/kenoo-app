import { NextResponse } from "next/server";

import { getDashboardAnalytics } from "@/lib/analytics-server";
import { getHealthDataScope } from "@/lib/health-scope";
import { parseTimeRangeParam, timeRangeToDays } from "@/lib/time-range";

export async function GET(request: Request) {
  const scope = await getHealthDataScope();
  if (!scope) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const timeRange = parseTimeRangeParam(searchParams.get("range"));
  const rangeDays = timeRangeToDays(timeRange);

  const analytics = await getDashboardAnalytics(scope, {
    rangeDays,
    timeRange,
  });
  return NextResponse.json(analytics);
}
