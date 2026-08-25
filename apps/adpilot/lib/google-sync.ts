import { createAdminClient } from "@walls/supabase/admin";

import { type AdDataScope, adScopeFields } from "@/lib/ad-scope";
import { GOOGLE_PROVIDER, type GoogleAdsConnectionRecord } from "@/lib/connections";
import {
  listGoogleAdsConnectionsWithTokens,
  updateGoogleAdsConnectionTokens,
} from "@/lib/connections-server";
import {
  digitsOnly,
  fetchGoogleAdsCustomerProfile,
  googleAdsDateRange,
  googleChannelToObjective,
  googleNumber,
  googleString,
  listGoogleAdsClientAccounts,
  normalizeGoogleAdsStatus,
  parseGoogleAdsMetrics,
  resourceId,
  searchGoogleAds,
  type GoogleAdsClientAccount,
  type GoogleAdsDailyMetrics,
} from "@/lib/google-ads-api";
import { refreshGoogleAccessToken } from "@/lib/google-ads-oauth";

type EntityType = "account" | "campaign" | "ad_group" | "ad";
type BudgetOptimization = "cbo" | "abo";

const METRICS_SELECT = `
  segments.date,
  metrics.impressions,
  metrics.clicks,
  metrics.cost_micros,
  metrics.conversions,
  metrics.conversions_value,
  metrics.ctr,
  metrics.average_cpc,
  metrics.average_cpm
`;

async function upsertSyncState(
  connectionId: string,
  scope: AdDataScope,
  patch: Record<string, unknown>,
) {
  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { data: existing } = await admin
    .from("ad_sync_state")
    .select("id")
    .eq("account_connection_id", connectionId)
    .maybeSingle();

  const row = {
    account_connection_id: connectionId,
    ...adScopeFields(scope),
    updated_at: now,
    ...patch,
  };

  if (existing?.id) {
    await admin.from("ad_sync_state").update(row).eq("id", existing.id);
  } else {
    await admin.from("ad_sync_state").insert(row);
  }
}

async function upsertEntity(input: {
  scope: AdDataScope;
  connectionId: string;
  entityType: EntityType;
  providerEntityId: string;
  parentId: string | null;
  name: string | null;
  status: string | null;
  objective?: string | null;
  dailyBudgetMicros?: number | null;
  lifetimeBudgetMicros?: number | null;
  budgetOptimization?: BudgetOptimization | null;
  rawPayload: Record<string, unknown>;
}): Promise<string> {
  const admin = createAdminClient();
  const now = new Date().toISOString();

  const row = {
    ...adScopeFields(input.scope),
    account_connection_id: input.connectionId,
    provider: GOOGLE_PROVIDER,
    entity_type: input.entityType,
    provider_entity_id: input.providerEntityId,
    parent_id: input.parentId,
    name: input.name,
    status: input.status,
    objective: input.objective ?? null,
    daily_budget_micros: input.dailyBudgetMicros ?? null,
    lifetime_budget_micros: input.lifetimeBudgetMicros ?? null,
    budget_optimization: input.budgetOptimization ?? null,
    raw_payload: input.rawPayload,
    last_synced_at: now,
    updated_at: now,
  };

  const { data: existing } = await admin
    .from("ad_entities")
    .select("id")
    .eq("account_connection_id", input.connectionId)
    .eq("entity_type", input.entityType)
    .eq("provider_entity_id", input.providerEntityId)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await admin
      .from("ad_entities")
      .update(row)
      .eq("id", existing.id);
    if (error) throw error;
    return existing.id;
  }

  const { data, error } = await admin
    .from("ad_entities")
    .insert(row)
    .select("id")
    .single();

  if (error) throw error;
  return data.id as string;
}

async function upsertDailyMetrics(input: {
  scope: AdDataScope;
  connectionId: string;
  entityId: string;
  metricDate: string;
  metrics: GoogleAdsDailyMetrics;
}) {
  const admin = createAdminClient();
  const row = {
    ...adScopeFields(input.scope),
    account_connection_id: input.connectionId,
    entity_id: input.entityId,
    metric_date: input.metricDate,
    impressions: input.metrics.impressions,
    clicks: input.metrics.clicks,
    spend_micros: input.metrics.spend_micros,
    reach: input.metrics.reach,
    frequency: input.metrics.frequency,
    conversions: input.metrics.conversions,
    conversion_value_micros: input.metrics.conversion_value_micros,
    website_purchases: input.metrics.website_purchases,
    add_to_cart: input.metrics.add_to_cart,
    ctr: input.metrics.ctr,
    cpc_micros: input.metrics.cpc_micros,
    cpm_micros: input.metrics.cpm_micros,
    roas: input.metrics.roas,
    updated_at: new Date().toISOString(),
  };

  const { error } = await admin
    .from("ad_metrics_daily")
    .upsert(row, { onConflict: "entity_id,metric_date" });

  if (error) throw error;
}

async function ensureGoogleAccessToken(
  connection: GoogleAdsConnectionRecord,
): Promise<string> {
  const expiryMs = connection.token_expiry
    ? new Date(connection.token_expiry).getTime()
    : 0;
  const stillFresh = expiryMs - Date.now() > 60_000;
  if (stillFresh && connection.access_token) {
    return connection.access_token;
  }

  if (!connection.refresh_token) {
    throw new Error("Google Ads connection is missing a refresh token.");
  }

  const tokens = await refreshGoogleAccessToken(connection.refresh_token);
  if (!tokens.access_token) {
    throw new Error("Google token refresh did not return an access token.");
  }

  const expiresIn = tokens.expires_in ?? 3600;
  const tokenExpiry = new Date(Date.now() + expiresIn * 1000).toISOString();
  await updateGoogleAdsConnectionTokens({
    connectionId: connection.id,
    accessToken: tokens.access_token,
    tokenExpiry,
  });
  connection.access_token = tokens.access_token;
  connection.token_expiry = tokenExpiry;
  return tokens.access_token;
}

async function upsertMetricsForQuery(input: {
  scope: AdDataScope;
  connectionId: string;
  customerId: string;
  accessToken: string;
  loginCustomerId: string | null;
  query: string;
  resolveEntityId: (row: Record<string, unknown>) => string | undefined;
}): Promise<number> {
  const rows = await searchGoogleAds(
    input.customerId,
    input.accessToken,
    input.query,
    input.loginCustomerId,
  );

  let upserted = 0;
  for (const row of rows) {
    const metricDate = googleString(row, "segments.date");
    const entityId = input.resolveEntityId(row);
    if (!metricDate || !entityId) continue;
    await upsertDailyMetrics({
      scope: input.scope,
      connectionId: input.connectionId,
      entityId,
      metricDate,
      metrics: parseGoogleAdsMetrics(row),
    });
    upserted += 1;
  }
  return upserted;
}

async function syncGoogleAdsCustomer(input: {
  scope: AdDataScope;
  connection: GoogleAdsConnectionRecord;
  accessToken: string;
  customer: GoogleAdsClientAccount;
  loginCustomerId: string | null;
  since: string;
  until: string;
}): Promise<{ campaigns: number; adGroups: number; ads: number; metricRows: number }> {
  const entityIds = new Map<string, string>();
  const customerId = input.customer.id;

  const accountEntityId = await upsertEntity({
    scope: input.scope,
    connectionId: input.connection.id,
    entityType: "account",
    providerEntityId: customerId,
    parentId: null,
    name: input.customer.name,
    status: "enabled",
    rawPayload: { ...input.customer, provider: GOOGLE_PROVIDER },
  });
  entityIds.set(customerId, accountEntityId);

  const dateFilter = `segments.date BETWEEN '${input.since}' AND '${input.until}'`;

  let metricRows = await upsertMetricsForQuery({
    scope: input.scope,
    connectionId: input.connection.id,
    customerId,
    accessToken: input.accessToken,
    loginCustomerId: input.loginCustomerId,
    query: `SELECT customer.id, ${METRICS_SELECT} FROM customer WHERE ${dateFilter}`,
    resolveEntityId: () => accountEntityId,
  });

  const campaignRows = await searchGoogleAds(
    customerId,
    input.accessToken,
    `SELECT
      campaign.id,
      campaign.name,
      campaign.status,
      campaign.primary_status,
      campaign.advertising_channel_type,
      campaign.bidding_strategy_type,
      campaign_budget.amount_micros,
      campaign_budget.period
     FROM campaign`,
    input.loginCustomerId,
  );

  for (const row of campaignRows) {
    const campaignId = digitsOnly(googleString(row, "campaign.id"));
    if (!campaignId) continue;
    const dailyBudgetMicros = Math.round(
      googleNumber(row, "campaignBudget.amountMicros"),
    );
    const period = googleString(row, "campaignBudget.period");
    const isDaily = !period || period.toUpperCase() === "DAILY";
    const entityId = await upsertEntity({
      scope: input.scope,
      connectionId: input.connection.id,
      entityType: "campaign",
      providerEntityId: campaignId,
      parentId: accountEntityId,
      name: googleString(row, "campaign.name"),
      status: normalizeGoogleAdsStatus(
        googleString(row, "campaign.primaryStatus") ??
          googleString(row, "campaign.status"),
      ),
      objective: googleChannelToObjective(
        googleString(row, "campaign.advertisingChannelType"),
      ),
      dailyBudgetMicros: isDaily && dailyBudgetMicros > 0 ? dailyBudgetMicros : null,
      lifetimeBudgetMicros:
        !isDaily && dailyBudgetMicros > 0 ? dailyBudgetMicros : null,
      budgetOptimization: "cbo",
      rawPayload: row,
    });
    entityIds.set(campaignId, entityId);
  }

  const adGroupRows = await searchGoogleAds(
    customerId,
    input.accessToken,
    `SELECT
      ad_group.id,
      ad_group.name,
      ad_group.status,
      ad_group.campaign,
      campaign.id
     FROM ad_group`,
    input.loginCustomerId,
  );

  for (const row of adGroupRows) {
    const adGroupId = digitsOnly(googleString(row, "adGroup.id"));
    if (!adGroupId) continue;
    const campaignId = digitsOnly(
      googleString(row, "campaign.id") ??
        resourceId(googleString(row, "adGroup.campaign")),
    );
    const parentId = campaignId
      ? (entityIds.get(campaignId) ?? accountEntityId)
      : accountEntityId;
    const entityId = await upsertEntity({
      scope: input.scope,
      connectionId: input.connection.id,
      entityType: "ad_group",
      providerEntityId: adGroupId,
      parentId,
      name: googleString(row, "adGroup.name"),
      status: normalizeGoogleAdsStatus(googleString(row, "adGroup.status")),
      rawPayload: row,
    });
    entityIds.set(adGroupId, entityId);
  }

  const adRows = await searchGoogleAds(
    customerId,
    input.accessToken,
    `SELECT
      ad_group_ad.ad.id,
      ad_group_ad.ad.name,
      ad_group_ad.status,
      ad_group_ad.ad_group,
      ad_group.id,
      campaign.id,
      ad_group_ad.ad.type,
      ad_group_ad.ad.final_urls
     FROM ad_group_ad`,
    input.loginCustomerId,
  );

  for (const row of adRows) {
    const adId = digitsOnly(googleString(row, "adGroupAd.ad.id"));
    if (!adId) continue;
    const adGroupId = digitsOnly(
      googleString(row, "adGroup.id") ??
        resourceId(googleString(row, "adGroupAd.adGroup")),
    );
    const parentId = adGroupId
      ? (entityIds.get(adGroupId) ?? accountEntityId)
      : accountEntityId;
    const name =
      googleString(row, "adGroupAd.ad.name") ??
      googleString(row, "adGroupAd.ad.type") ??
      `Ad ${adId}`;
    const entityId = await upsertEntity({
      scope: input.scope,
      connectionId: input.connection.id,
      entityType: "ad",
      providerEntityId: adId,
      parentId,
      name,
      status: normalizeGoogleAdsStatus(googleString(row, "adGroupAd.status")),
      rawPayload: row,
    });
    entityIds.set(adId, entityId);
  }

  metricRows += await upsertMetricsForQuery({
    scope: input.scope,
    connectionId: input.connection.id,
    customerId,
    accessToken: input.accessToken,
    loginCustomerId: input.loginCustomerId,
    query: `SELECT campaign.id, ${METRICS_SELECT} FROM campaign WHERE ${dateFilter}`,
    resolveEntityId: (row) =>
      entityIds.get(digitsOnly(googleString(row, "campaign.id"))),
  });

  metricRows += await upsertMetricsForQuery({
    scope: input.scope,
    connectionId: input.connection.id,
    customerId,
    accessToken: input.accessToken,
    loginCustomerId: input.loginCustomerId,
    query: `SELECT ad_group.id, ${METRICS_SELECT} FROM ad_group WHERE ${dateFilter}`,
    resolveEntityId: (row) =>
      entityIds.get(digitsOnly(googleString(row, "adGroup.id"))),
  });

  metricRows += await upsertMetricsForQuery({
    scope: input.scope,
    connectionId: input.connection.id,
    customerId,
    accessToken: input.accessToken,
    loginCustomerId: input.loginCustomerId,
    query: `SELECT ad_group_ad.ad.id, ${METRICS_SELECT} FROM ad_group_ad WHERE ${dateFilter}`,
    resolveEntityId: (row) =>
      entityIds.get(digitsOnly(googleString(row, "adGroupAd.ad.id"))),
  });

  return {
    campaigns: campaignRows.length,
    adGroups: adGroupRows.length,
    ads: adRows.length,
    metricRows,
  };
}

export async function syncGoogleAdsConnection(
  connection: GoogleAdsConnectionRecord,
  scope: AdDataScope,
) {
  const customerId = digitsOnly(connection.provider_account_id);
  if (!customerId) {
    throw new Error("Google Ads connection is missing provider_account_id.");
  }

  await upsertSyncState(connection.id, scope, {
    sync_status: "running",
    last_error: null,
  });

  try {
    const accessToken = await ensureGoogleAccessToken(connection);
    const { since, until } = googleAdsDateRange(30);
    const profile = await fetchGoogleAdsCustomerProfile(customerId, accessToken);

    const customers: GoogleAdsClientAccount[] = profile.manager
      ? await listGoogleAdsClientAccounts(customerId, accessToken)
      : [profile];

    const loginCustomerId = profile.manager ? customerId : null;

    if (customers.length === 0) {
      throw new Error(
        "This Google user is a manager account with no client Ads accounts to sync.",
      );
    }

    let campaigns = 0;
    let adGroups = 0;
    let ads = 0;
    let metricRows = 0;

    for (const customer of customers) {
      const result = await syncGoogleAdsCustomer({
        scope,
        connection,
        accessToken,
        customer,
        loginCustomerId,
        since,
        until,
      });
      campaigns += result.campaigns;
      adGroups += result.adGroups;
      ads += result.ads;
      metricRows += result.metricRows;
    }

    const now = new Date().toISOString();
    await upsertSyncState(connection.id, scope, {
      sync_status: "idle",
      last_full_sync_at: now,
      last_insights_sync_at: now,
      last_incremental_sync_at: now,
      insights_cursor: { since, until },
      entity_cursor: { campaigns, ad_groups: adGroups, ads, metricRows },
      last_error: null,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Google Ads sync failed";
    await upsertSyncState(connection.id, scope, {
      sync_status: "error",
      last_error: message,
    });
    throw error;
  }
}

export async function syncGoogleAdsConnectionsForAccount(scope: AdDataScope) {
  const connections = await listGoogleAdsConnectionsWithTokens(scope.accountId);
  const results: Array<{ connectionId: string; ok: boolean; error?: string }> =
    [];

  for (const connection of connections) {
    try {
      await syncGoogleAdsConnection(connection, scope);
      results.push({ connectionId: connection.id, ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sync failed";
      results.push({ connectionId: connection.id, ok: false, error: message });
    }
  }

  return results;
}
