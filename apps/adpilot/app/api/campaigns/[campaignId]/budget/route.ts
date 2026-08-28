import { NextResponse } from "next/server";

import { getAdDataScope } from "@/lib/ad-scope";
import { updateEntityDailyBudget } from "@/lib/entity-budget-server";

type RouteContext = {
  params: Promise<{ campaignId: string }>;
};

type BudgetPatchBody = {
  dailyBudgetMicros?: number;
};

export async function PATCH(request: Request, context: RouteContext) {
  const scope = await getAdDataScope();
  if (!scope) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { campaignId: entityId } = await context.params;

  let body: BudgetPatchBody;
  try {
    body = (await request.json()) as BudgetPatchBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const dailyBudgetMicros = Number(body.dailyBudgetMicros);
  if (!Number.isFinite(dailyBudgetMicros) || dailyBudgetMicros <= 0) {
    return NextResponse.json(
      { error: "dailyBudgetMicros must be greater than zero." },
      { status: 400 },
    );
  }

  try {
    const result = await updateEntityDailyBudget({
      scope,
      entityId,
      dailyBudgetMicros,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update daily budget";
    const status = message === "Entity not found" ? 404 : 400;
    console.error("[adpilot] entity budget:", error);
    return NextResponse.json({ error: message }, { status });
  }
}
