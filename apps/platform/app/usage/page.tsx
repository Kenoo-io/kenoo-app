import { createAdminClient } from "@walls/supabase/admin";

import { UsageDashboard, type UsageEventRow } from "@/components/platform/usage-dashboard";
import { getActiveAccount, getCurrentUserId } from "@/lib/account-context";
import { monthUsageSpendCents } from "@/lib/limits";
import { listPlatformApiKeys } from "@/lib/list-api-keys";
import { ensureWallet } from "@/lib/wallet";

function nestedRecord<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export default async function UsagePage() {
  const userId = await getCurrentUserId();
  const account = userId ? await getActiveAccount(userId) : null;
  const admin = createAdminClient();
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 90);

  const events: UsageEventRow[] = [];
  let keys: { id: string; name: string }[] = [];
  let monthSpendCents = 0;
  let monthLimitCents: number | null = null;

  if (account) {
    const [{ data }, listedKeys] = await Promise.all([
      admin
        .from("platform_usage_events")
        .select(
          "id, created_at, amount_cents, status, request_id, api_key_id, units, platform_products ( name, slug ), platform_api_keys ( id, name )",
        )
        .eq("account_id", account.id)
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: false })
        .limit(5000),
      listPlatformApiKeys(admin, account.id),
    ]);

    keys = listedKeys.map((key) => ({ id: key.id, name: key.name }));
    monthSpendCents = await monthUsageSpendCents(admin, account.id);

    try {
      const wallet = await ensureWallet(admin, account.id);
      monthLimitCents = wallet.monthly_spend_limit_cents;
    } catch (error) {
      console.error("[platform] usage wallet:", error);
    }

    for (const row of data ?? []) {
      const product = nestedRecord(
        row.platform_products as
          | { name: string; slug: string }
          | { name: string; slug: string }[]
          | null,
      );
      const key = nestedRecord(
        row.platform_api_keys as
          | { id: string; name: string }
          | { id: string; name: string }[]
          | null,
      );
      events.push({
        id: row.id as string,
        created_at: row.created_at as string,
        amount_cents: Number(row.amount_cents ?? 0),
        status: String(row.status ?? "success"),
        request_id: (row.request_id as string | null) ?? null,
        api_key_id: (row.api_key_id as string | null) ?? null,
        units: Number(row.units ?? 1),
        productName: product?.name ?? "Unknown",
        keyName: key?.name ?? null,
      });
    }
  }

  const monthLabel = `${new Date().toLocaleDateString("en-US", {
    month: "long",
  })} spend`;

  return (
    <UsageDashboard
      events={events}
      keys={keys}
      accountName={account?.name ?? "No workspace"}
      monthSpendCents={monthSpendCents}
      monthLimitCents={monthLimitCents}
      monthLabel={monthLabel}
    />
  );
}
