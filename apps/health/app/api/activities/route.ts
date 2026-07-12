import { NextResponse } from "next/server";

import { listRecentActivities } from "@/lib/activities-server";
import { getHealthDataScope } from "@/lib/health-scope";

export async function GET() {
  const scope = await getHealthDataScope();
  if (!scope) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const activities = await listRecentActivities(scope);
  return NextResponse.json({ activities });
}
