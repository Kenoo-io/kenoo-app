import { createAdminClient } from "@walls/supabase/admin";
import { createClient } from "@walls/supabase/server";

import { type AdDataScope, withAdScope } from "@/lib/ad-scope";
import { applyProviderDailyBudget } from "@/lib/ad-provider-write";

const BUDGETABLE_ENTITY_TYPES = new Set(["campaign", "ad_group"]);

export async function updateEntityDailyBudget(input: {
  scope: AdDataScope;
  entityId: string;
  dailyBudgetMicros: number;
}): Promise<{ dailyBudgetMicros: number; dailyBudgetInherited: boolean }> {
  const amount = Math.round(input.dailyBudgetMicros);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Daily budget must be greater than zero.");
  }

  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: entity, error: entityError } = await withAdScope(
    supabase
      .from("ad_entities")
      .select(
        "id, entity_type, provider, provider_entity_id, parent_id, account_connection_id, daily_budget_micros",
      )
      .eq("id", input.entityId),
    input.scope,
  ).maybeSingle();

  if (entityError) throw entityError;
  if (!entity) throw new Error("Entity not found");

  if (!BUDGETABLE_ENTITY_TYPES.has(entity.entity_type as string)) {
    throw new Error(
      "Only campaigns, ad sets, and ad groups support daily budget changes.",
    );
  }

  const ownBudget = entity.daily_budget_micros as number | null;
  let target = {
    id: entity.id as string,
    entityType: entity.entity_type as string,
    providerEntityId: entity.provider_entity_id as string,
    parentId: (entity.parent_id as string | null) ?? null,
    inherited: false,
  };

  if (
    (ownBudget == null || ownBudget <= 0) &&
    entity.entity_type === "ad_group" &&
    entity.parent_id
  ) {
    const { data: parent, error: parentError } = await withAdScope(
      supabase
        .from("ad_entities")
        .select("id, entity_type, provider_entity_id, parent_id, daily_budget_micros")
        .eq("id", entity.parent_id as string),
      input.scope,
    ).maybeSingle();

    if (parentError) throw parentError;
    if (parent?.entity_type === "campaign") {
      target = {
        id: parent.id as string,
        entityType: "campaign",
        providerEntityId: parent.provider_entity_id as string,
        parentId: (parent.parent_id as string | null) ?? null,
        inherited: true,
      };
    }
  }

  await applyProviderDailyBudget({
    accountId: input.scope.accountId,
    connectionId: entity.account_connection_id as string,
    provider: (entity.provider as string | null) ?? null,
    entityType: target.entityType,
    providerEntityId: target.providerEntityId,
    parentId: target.parentId,
    dailyBudgetMicros: amount,
  });

  const now = new Date().toISOString();
  const { error: entityUpdateError } = await withAdScope(
    admin
      .from("ad_entities")
      .update({ daily_budget_micros: amount, updated_at: now })
      .eq("id", target.id),
    input.scope,
  );

  if (entityUpdateError) throw entityUpdateError;

  return {
    dailyBudgetMicros: amount,
    dailyBudgetInherited: target.inherited,
  };
}
