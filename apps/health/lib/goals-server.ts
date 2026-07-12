import { createClient } from "@walls/supabase/server";

import { type HealthDataScope, healthScopeFields, withHealthScope } from "@/lib/health-scope";

export type HealthGoal = {
  id: string;
  name: string;
  description: string | null;
  goal_type: string;
  target_value: number;
  target_unit: string;
  period: string;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
};

export type CreateGoalInput = {
  name: string;
  description?: string;
  goal_type: string;
  target_value: number;
  target_unit: string;
  period?: string;
};

export async function listGoals(scope: HealthDataScope): Promise<HealthGoal[]> {
  const supabase = await createClient();
  const { data, error } = await withHealthScope(
    supabase
      .from("health_goals")
      .select("*")
      .order("is_active", { ascending: false })
      .order("start_date", { ascending: false }),
    scope,
  );

  if (error) {
    console.error("[health] list goals:", error);
    return [];
  }

  return (data ?? []) as HealthGoal[];
}

export async function createGoal(
  scope: HealthDataScope,
  input: CreateGoalInput,
): Promise<HealthGoal> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("health_goals")
    .insert({
      ...healthScopeFields(scope),
      name: input.name,
      description: input.description ?? null,
      goal_type: input.goal_type,
      target_value: input.target_value,
      target_unit: input.target_unit,
      period: input.period ?? "weekly",
      is_active: true,
      settings: {},
    })
    .select("*")
    .single();

  if (error) {
    console.error("[health] create goal:", error);
    throw error;
  }

  return data as HealthGoal;
}
