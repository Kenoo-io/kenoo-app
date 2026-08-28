import { createAdminClient } from "@walls/supabase/admin";

import {
  ensureGoogleAdsAccessToken,
  getGoogleAdsConnectionById,
} from "@/lib/connections-server";
import { GOOGLE_PROVIDER, META_PROVIDER } from "@/lib/connections";
import {
  digitsOnly,
  updateGoogleEntityDailyBudget,
  updateGoogleEntityStatus,
  type GoogleAdsDeliveryStatus,
} from "@/lib/google-ads-api";
import {
  updateMetaEntityDailyBudget,
  updateMetaEntityStatus,
} from "@/lib/meta-graph";

async function parentCampaignProviderId(
  parentId: string | null,
): Promise<string | null> {
  if (!parentId) return null;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("ad_entities")
    .select("provider_entity_id, entity_type")
    .eq("id", parentId)
    .maybeSingle();
  if (error) throw error;
  if (!data || data.entity_type !== "campaign") return null;
  return (data.provider_entity_id as string | null) ?? null;
}

export async function applyProviderDeliveryStatus(input: {
  accountId: string;
  connectionId: string;
  provider: string | null;
  entityType: string;
  providerEntityId: string;
  parentId: string | null;
  status: GoogleAdsDeliveryStatus;
}): Promise<Record<string, unknown>> {
  const provider = (input.provider ?? META_PROVIDER).toLowerCase();

  if (provider === GOOGLE_PROVIDER) {
    const connection = await getGoogleAdsConnectionById(
      input.connectionId,
      input.accountId,
    );
    if (!connection?.provider_account_id) {
      throw new Error("Google Ads connection is not available for this ad account.");
    }
    const accessToken = await ensureGoogleAdsAccessToken(connection);
    return updateGoogleEntityStatus({
      customerId: digitsOnly(connection.provider_account_id),
      entityType: input.entityType,
      providerEntityId: input.providerEntityId,
      accessToken,
      status: input.status,
    });
  }

  const admin = createAdminClient();
  const { data: connection, error } = await admin
    .from("account_connections")
    .select("access_token")
    .eq("id", input.connectionId)
    .eq("account_id", input.accountId)
    .is("revoked_at", null)
    .maybeSingle();
  if (error) throw error;
  const accessToken = connection?.access_token as string | undefined;
  if (!accessToken) {
    throw new Error("Meta connection is not available for this ad account.");
  }
  return updateMetaEntityStatus(
    input.providerEntityId,
    accessToken,
    input.status,
  );
}

export async function applyProviderDailyBudget(input: {
  accountId: string;
  connectionId: string;
  provider: string | null;
  entityType: string;
  providerEntityId: string;
  parentId: string | null;
  dailyBudgetMicros: number;
}): Promise<Record<string, unknown>> {
  const provider = (input.provider ?? META_PROVIDER).toLowerCase();

  if (provider === GOOGLE_PROVIDER) {
    const connection = await getGoogleAdsConnectionById(
      input.connectionId,
      input.accountId,
    );
    if (!connection?.provider_account_id) {
      throw new Error("Google Ads connection is not available for this ad account.");
    }
    const accessToken = await ensureGoogleAdsAccessToken(connection);
    const parentCampaignId = await parentCampaignProviderId(input.parentId);
    return updateGoogleEntityDailyBudget({
      customerId: digitsOnly(connection.provider_account_id),
      entityType: input.entityType,
      providerEntityId: input.providerEntityId,
      accessToken,
      dailyBudgetMicros: input.dailyBudgetMicros,
      parentCampaignProviderId: parentCampaignId,
    });
  }

  const admin = createAdminClient();
  const { data: connection, error } = await admin
    .from("account_connections")
    .select("access_token")
    .eq("id", input.connectionId)
    .eq("account_id", input.accountId)
    .is("revoked_at", null)
    .maybeSingle();
  if (error) throw error;
  const accessToken = connection?.access_token as string | undefined;
  if (!accessToken) {
    throw new Error("Meta connection is not available for this ad account.");
  }
  return updateMetaEntityDailyBudget(
    input.providerEntityId,
    accessToken,
    input.dailyBudgetMicros,
  );
}
