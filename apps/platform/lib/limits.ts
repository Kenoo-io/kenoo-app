import type { SupabaseClient } from "@supabase/supabase-js";

export type ProductLimitRow = {
  product_id: string;
  blocked: boolean;
  monthly_request_limit: number | null;
};

export type LimitsProduct = {
  id: string;
  slug: string;
  name: string;
  is_live: boolean;
};

export function utcMonthStartIso(): string {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0),
  ).toISOString();
}

export async function monthUsageSpendCents(
  admin: SupabaseClient,
  accountId: string,
): Promise<number> {
  const { data, error } = await admin
    .from("platform_usage_events")
    .select("amount_cents")
    .eq("account_id", accountId)
    .eq("status", "success")
    .gte("created_at", utcMonthStartIso());

  if (error) {
    console.error("[platform] month spend:", error);
    return 0;
  }

  return (data ?? []).reduce(
    (sum, row) => sum + Number(row.amount_cents ?? 0),
    0,
  );
}

export async function monthRequestCounts(
  admin: SupabaseClient,
  accountId: string,
): Promise<Record<string, number>> {
  const { data, error } = await admin
    .from("platform_usage_events")
    .select("product_id")
    .eq("account_id", accountId)
    .eq("status", "success")
    .gte("created_at", utcMonthStartIso());

  if (error) {
    console.error("[platform] month requests:", error);
    return {};
  }

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    const id = row.product_id as string | null;
    if (!id) continue;
    counts[id] = (counts[id] ?? 0) + 1;
  }
  return counts;
}

export async function listProductLimits(
  admin: SupabaseClient,
  accountId: string,
): Promise<ProductLimitRow[]> {
  const { data, error } = await admin
    .from("platform_product_limits")
    .select("product_id, blocked, monthly_request_limit")
    .eq("account_id", accountId);

  if (error) {
    console.error("[platform] product limits:", error);
    return [];
  }

  return (data ?? []) as ProductLimitRow[];
}

export type SpendAlertRow = {
  id: string;
  threshold_percent: number;
};

export async function listSpendAlerts(
  admin: SupabaseClient,
  accountId: string,
): Promise<SpendAlertRow[]> {
  const { data, error } = await admin
    .from("platform_spend_alerts")
    .select("id, threshold_percent")
    .eq("account_id", accountId)
    .order("threshold_percent", { ascending: true });

  if (error) {
    console.error("[platform] spend alerts:", error);
    return [];
  }

  return (data ?? []) as SpendAlertRow[];
}

export function daysUntilUtcMonthReset(): number {
  const now = new Date();
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1);
  return Math.max(0, Math.ceil((next - Date.now()) / 86_400_000));
}
