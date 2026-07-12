import { createClient } from "@walls/supabase/server";

import type { HealthDataScope } from "@/lib/health-scope";
import { withHealthScope } from "@/lib/health-scope";

export type HealthActivity = {
  id: string;
  user_id: string;
  provider: string;
  activity_type: string;
  name: string | null;
  description: string | null;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  distance_meters: number | null;
  calories_burned: number | null;
  avg_heart_rate: number | null;
};

export async function listActivitiesInRange(
  scope: HealthDataScope,
  startIso: string,
  endIso: string,
): Promise<HealthActivity[]> {
  const supabase = await createClient();
  const { data, error } = await withHealthScope(
    supabase
      .from("health_activities")
      .select(
        "id, user_id, provider, activity_type, name, description, started_at, ended_at, duration_seconds, distance_meters, calories_burned, avg_heart_rate",
      )
      .gte("started_at", startIso)
      .lte("started_at", endIso)
      .order("started_at", { ascending: false }),
    scope,
  );

  if (error) {
    console.error("[health] list activities:", error);
    return [];
  }

  return (data ?? []) as HealthActivity[];
}

export async function listRecentActivities(
  scope: HealthDataScope,
  limit = 20,
): Promise<HealthActivity[]> {
  const supabase = await createClient();
  const { data, error } = await withHealthScope(
    supabase
      .from("health_activities")
      .select(
        "id, user_id, provider, activity_type, name, description, started_at, ended_at, duration_seconds, distance_meters, calories_burned, avg_heart_rate",
      )
      .order("started_at", { ascending: false })
      .limit(limit),
    scope,
  );

  if (error) {
    console.error("[health] list recent activities:", error);
    return [];
  }

  return (data ?? []) as HealthActivity[];
}
