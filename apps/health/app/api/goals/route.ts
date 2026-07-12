import { NextResponse } from "next/server";

import { createGoal, listGoals, type CreateGoalInput } from "@/lib/goals-server";
import { getHealthDataScope } from "@/lib/health-scope";

export async function GET() {
  const scope = await getHealthDataScope();
  if (!scope) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const goals = await listGoals(scope);
  return NextResponse.json({ goals });
}

export async function POST(request: Request) {
  const scope = await getHealthDataScope();
  if (!scope) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as CreateGoalInput;
  if (!body.name || !body.goal_type || body.target_value == null) {
    return NextResponse.json(
      { error: "name, goal_type, and target_value are required" },
      { status: 400 },
    );
  }

  const goal = await createGoal(scope, body);
  return NextResponse.json({ goal });
}
