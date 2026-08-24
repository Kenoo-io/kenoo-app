import type { SupabaseClient } from "@supabase/supabase-js";

export type PlatformApiKeyRow = {
  id: string;
  name: string;
  key_prefix: string;
  tracking_id: string;
  last_used_at: string | null;
  created_at: string;
  revoked_at: string | null;
  created_by_name: string;
  monthly_spend_cents: number;
};

function trackingIdFromUuid(id: string): string {
  return `key_${id.replaceAll("-", "").slice(0, 15)}`;
}

function displayName(user: {
  first_name: string | null;
  last_name: string | null;
  email: string;
} | null): string {
  if (!user) return "—";
  const name = `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim();
  return name || user.email;
}

function startOfUtcMonthIso(): string {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  ).toISOString();
}

export async function listPlatformApiKeys(
  admin: SupabaseClient,
  accountId: string,
): Promise<PlatformApiKeyRow[]> {
  const { data: keys, error } = await admin
    .from("platform_api_keys")
    .select(
      "id, name, key_prefix, last_used_at, created_at, revoked_at, created_by",
    )
    .eq("account_id", accountId)
    .order("created_at", { ascending: false });

  if (error || !keys) return [];

  const creatorIds = [
    ...new Set(
      keys
        .map((key) => key.created_by as string | null)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const [{ data: users }, { data: usage }] = await Promise.all([
    creatorIds.length
      ? admin
          .from("users")
          .select("id, first_name, last_name, email")
          .in("id", creatorIds)
      : Promise.resolve({ data: [] as { id: string; first_name: string | null; last_name: string | null; email: string }[] }),
    admin
      .from("platform_usage_events")
      .select("api_key_id, amount_cents")
      .eq("account_id", accountId)
      .gte("created_at", startOfUtcMonthIso()),
  ]);

  const userById = new Map(
    (users ?? []).map((user) => [user.id as string, user]),
  );
  const spendByKey = new Map<string, number>();
  for (const event of usage ?? []) {
    const keyId = event.api_key_id as string | null;
    if (!keyId) continue;
    spendByKey.set(
      keyId,
      (spendByKey.get(keyId) ?? 0) + Number(event.amount_cents ?? 0),
    );
  }

  return keys.map((key) => {
    const creator = key.created_by
      ? userById.get(key.created_by as string) ?? null
      : null;
    return {
      id: key.id as string,
      name: key.name as string,
      key_prefix: key.key_prefix as string,
      tracking_id: trackingIdFromUuid(key.id as string),
      last_used_at: (key.last_used_at as string | null) ?? null,
      created_at: key.created_at as string,
      revoked_at: (key.revoked_at as string | null) ?? null,
      created_by_name: displayName(creator),
      monthly_spend_cents: spendByKey.get(key.id as string) ?? 0,
    };
  });
}
