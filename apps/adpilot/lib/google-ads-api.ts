import {
  GOOGLE_ADS_API_VERSION,
  getGoogleAdsLoginCustomerId,
  googleAdsHeaders,
} from "@/lib/google-ads-oauth";

export function digitsOnly(value: string | number | null | undefined): string {
  return String(value ?? "").replace(/\D/g, "");
}

export function resourceId(
  value: string | number | null | undefined,
): string {
  if (value == null) return "";
  const parts = String(value).split("/");
  return parts[parts.length - 1] ?? "";
}

export type GoogleAdsSearchRow = Record<string, unknown>;

type GoogleAdsSearchResponse = {
  results?: GoogleAdsSearchRow[];
  nextPageToken?: string;
  error?: { message?: string; status?: string };
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function googleField(
  row: GoogleAdsSearchRow,
  path: string,
): unknown {
  const parts = path.split(".");
  let current: unknown = row;
  for (const part of parts) {
    const record = asRecord(current);
    if (!record) return undefined;
    current = record[part];
  }
  return current;
}

export function googleString(
  row: GoogleAdsSearchRow,
  path: string,
): string | null {
  const value = googleField(row, path);
  if (value == null) return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

export function googleNumber(
  row: GoogleAdsSearchRow,
  path: string,
): number {
  const value = googleField(row, path);
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function searchOnce(
  customerId: string,
  accessToken: string,
  query: string,
  pageToken: string | undefined,
  loginCustomerId: string | null,
): Promise<GoogleAdsSearchResponse> {
  const response = await fetch(
    `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}/customers/${customerId}/googleAds:search`,
    {
      method: "POST",
      headers: googleAdsHeaders(accessToken, loginCustomerId),
      body: JSON.stringify({
        query,
        pageSize: 1000,
        ...(pageToken ? { pageToken } : {}),
      }),
    },
  );

  const payload = (await response.json()) as GoogleAdsSearchResponse;
  if (!response.ok) {
    const message =
      payload.error?.message ?? JSON.stringify(payload).slice(0, 800);
    throw new Error(`Google Ads search failed (${response.status}): ${message}`);
  }

  return payload;
}

function shouldRetryWithLoginCustomer(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /PERMISSION_DENIED|login-customer-id|CUSTOMER_NOT_ENABLED|USER_PERMISSION_DENIED|authorization/i.test(
    message,
  );
}

/**
 * Run a GAQL search, paging through every result. Tries without
 * `login-customer-id` first (direct accounts), then retries with the Kenoo MCC
 * id when Google requires a manager header.
 */
export async function searchGoogleAds(
  customerId: string,
  accessToken: string,
  query: string,
  loginCustomerId?: string | null,
): Promise<GoogleAdsSearchRow[]> {
  const cid = digitsOnly(customerId);
  const candidates: Array<string | null> = [];

  if (loginCustomerId !== undefined) {
    candidates.push(loginCustomerId ? digitsOnly(loginCustomerId) : null);
  } else {
    candidates.push(null);
    const envLogin = getGoogleAdsLoginCustomerId();
    if (envLogin && envLogin !== cid) candidates.push(envLogin);
  }

  let lastError: unknown = null;

  for (const candidate of candidates) {
    try {
      const results: GoogleAdsSearchRow[] = [];
      let pageToken: string | undefined;
      do {
        const payload = await searchOnce(
          cid,
          accessToken,
          query,
          pageToken,
          candidate,
        );
        results.push(...(payload.results ?? []));
        pageToken = payload.nextPageToken;
      } while (pageToken);
      return results;
    } catch (error) {
      lastError = error;
      if (!shouldRetryWithLoginCustomer(error)) throw error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Google Ads search failed");
}

export type GoogleAdsClientAccount = {
  id: string;
  name: string;
  manager: boolean;
};

export async function fetchGoogleAdsCustomerProfile(
  customerId: string,
  accessToken: string,
  loginCustomerId?: string | null,
): Promise<GoogleAdsClientAccount> {
  const rows = await searchGoogleAds(
    customerId,
    accessToken,
    "SELECT customer.id, customer.descriptive_name, customer.manager, customer.status FROM customer LIMIT 1",
    loginCustomerId,
  );
  const row = rows[0] ?? {};
  return {
    id: digitsOnly(googleString(row, "customer.id") ?? customerId),
    name:
      googleString(row, "customer.descriptiveName") ??
      `Google Ads ${digitsOnly(customerId)}`,
    manager: Boolean(googleField(row, "customer.manager")),
  };
}

export async function listGoogleAdsClientAccounts(
  managerCustomerId: string,
  accessToken: string,
): Promise<GoogleAdsClientAccount[]> {
  const rows = await searchGoogleAds(
    managerCustomerId,
    accessToken,
    `SELECT
      customer_client.id,
      customer_client.descriptive_name,
      customer_client.manager,
      customer_client.status
     FROM customer_client
     WHERE customer_client.status = 'ENABLED'
       AND customer_client.manager = FALSE`,
    digitsOnly(managerCustomerId),
  );

  return rows
    .map((row) => ({
      id: digitsOnly(googleString(row, "customerClient.id")),
      name:
        googleString(row, "customerClient.descriptiveName") ??
        `Google Ads ${digitsOnly(googleString(row, "customerClient.id"))}`,
      manager: Boolean(googleField(row, "customerClient.manager")),
    }))
    .filter((client) => client.id.length > 0);
}

export type GoogleAdsDailyMetrics = {
  impressions: number;
  clicks: number;
  spend_micros: number;
  reach: number;
  frequency: number | null;
  conversions: number;
  conversion_value_micros: number;
  website_purchases: number;
  add_to_cart: number;
  ctr: number;
  cpc_micros: number;
  cpm_micros: number;
  roas: number | null;
};

export function parseGoogleAdsMetrics(
  row: GoogleAdsSearchRow,
): GoogleAdsDailyMetrics {
  const impressions = Math.round(googleNumber(row, "metrics.impressions"));
  const clicks = Math.round(googleNumber(row, "metrics.clicks"));
  const spendMicros = Math.round(googleNumber(row, "metrics.costMicros"));
  const conversions = googleNumber(row, "metrics.conversions");
  const conversionValue = googleNumber(row, "metrics.conversionsValue");
  const conversionValueMicros = Math.round(conversionValue * 1_000_000);
  const ctr = googleNumber(row, "metrics.ctr");
  const cpcMicros = Math.round(googleNumber(row, "metrics.averageCpc"));
  const cpmMicros = Math.round(googleNumber(row, "metrics.averageCpm"));
  const roas =
    spendMicros > 0 ? conversionValueMicros / spendMicros : null;

  return {
    impressions,
    clicks,
    spend_micros: spendMicros,
    reach: 0,
    frequency: null,
    conversions,
    conversion_value_micros: conversionValueMicros,
    website_purchases: conversions,
    add_to_cart: 0,
    ctr,
    cpc_micros: cpcMicros,
    cpm_micros: cpmMicros,
    roas,
  };
}

export function googleAdsDateRange(days: number): {
  since: string;
  until: string;
} {
  const until = new Date();
  const since = new Date();
  since.setDate(until.getDate() - days);
  const format = (date: Date) => date.toISOString().slice(0, 10);
  return { since: format(since), until: format(until) };
}

export function normalizeGoogleAdsStatus(
  status: string | null | undefined,
): string | null {
  if (!status) return null;
  return status.toLowerCase();
}

/** Map Google advertising_channel_type onto Meta-style dashboard buckets. */
export function googleChannelToObjective(
  channelType: string | null | undefined,
): string | null {
  if (!channelType) return null;
  const channel = channelType.toUpperCase();
  switch (channel) {
    case "SHOPPING":
    case "PERFORMANCE_MAX":
    case "LOCAL":
    case "LOCAL_SERVICES":
      return "OUTCOME_SALES";
    case "SEARCH":
    case "SEARCH_PARTNERS":
    case "DISPLAY":
    case "SMART":
    case "DEMAND_GEN":
      return "OUTCOME_TRAFFIC";
    case "VIDEO":
    case "DISCOVERY":
      return "OUTCOME_ENGAGEMENT";
    case "MULTI_CHANNEL":
      return "OUTCOME_APP_PROMOTION";
    default:
      return channel;
  }
}
