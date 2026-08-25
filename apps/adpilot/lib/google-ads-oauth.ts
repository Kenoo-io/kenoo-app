/** Google Ads API REST version - bump when Google deprecates the prior version. */
export const GOOGLE_ADS_API_VERSION = "v24";

export const GOOGLE_ADS_SCOPES = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/adwords",
] as const;

export function getAdpilotBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_ADPILOT_URL?.replace(/\/$/, "");
  if (configured) return configured;
  return "http://localhost:3001";
}

export function getGoogleClientId(): string {
  const clientId =
    process.env.GOOGLE_CLIENT_ID ?? process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error("Missing GOOGLE_CLIENT_ID configuration.");
  }
  return clientId;
}

export function getGoogleClientSecret(): string {
  const secret = process.env.GOOGLE_CLIENT_SECRET;
  if (!secret) {
    throw new Error("Missing GOOGLE_CLIENT_SECRET configuration.");
  }
  return secret;
}

export function getGoogleAdsDeveloperToken(): string {
  const token = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  if (!token) {
    throw new Error("Missing GOOGLE_ADS_DEVELOPER_TOKEN configuration.");
  }
  return token;
}

/** Optional Kenoo MCC id (digits only) for `login-customer-id` on Ads API calls. */
export function getGoogleAdsLoginCustomerId(): string | null {
  const raw = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID?.trim();
  if (!raw) return null;
  return raw.replace(/-/g, "");
}

export function getGoogleAdsRedirectUri(origin = getAdpilotBaseUrl()): string {
  return `${origin.replace(/\/$/, "")}/api/oauth/google/callback`;
}

export function getGoogleAdsLoginUri(origin = getAdpilotBaseUrl()): string {
  return `${origin.replace(/\/$/, "")}/api/oauth/google/login`;
}

/**
 * Keep the OAuth round-trip on the origin the user actually clicked Connect
 * from (localhost vs production). Preview hosts still use the configured URL
 * so Google only sees registered redirect URIs.
 */
export function getAdpilotOriginFromRequest(request: {
  nextUrl: { origin: string };
}): string {
  const requestOrigin = request.nextUrl.origin.replace(/\/$/, "");
  try {
    const hostname = new URL(requestOrigin).hostname;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return requestOrigin;
    }
  } catch {
    // fall through to configured production URL
  }
  return getAdpilotBaseUrl();
}

export function buildGoogleAdsAuthorizeUrl(
  state: string,
  redirectUri = getGoogleAdsRedirectUri(),
): string {
  const params = new URLSearchParams({
    client_id: getGoogleClientId(),
    redirect_uri: redirectUri,
    response_type: "code",
    scope: GOOGLE_ADS_SCOPES.join(" "),
    access_type: "offline",
    prompt: "select_account consent",
    include_granted_scopes: "false",
    state,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export type GoogleTokenResponse = {
  access_token: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
  id_token?: string;
};

export async function exchangeGoogleCodeForTokens(
  code: string,
  redirectUri = getGoogleAdsRedirectUri(),
): Promise<GoogleTokenResponse> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: getGoogleClientId(),
      client_secret: getGoogleClientSecret(),
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Google token exchange failed: ${body}`);
  }

  return response.json() as Promise<GoogleTokenResponse>;
}

/**
 * Revokes a Google access or refresh token. Google treats this as disconnecting
 * the entire OAuth grant for this client, so reconnecting starts a fresh consent.
 */
export async function revokeGoogleOAuthToken(token: string): Promise<void> {
  const response = await fetch("https://oauth2.googleapis.com/revoke", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ token }),
  });

  if (response.ok || response.status === 400) {
    return;
  }

  const body = await response.text();
  console.error("[adpilot] Google token revoke failed:", response.status, body);
}

export async function refreshGoogleAccessToken(
  refreshToken: string,
): Promise<GoogleTokenResponse> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: getGoogleClientId(),
      client_secret: getGoogleClientSecret(),
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Google token refresh failed: ${body}`);
  }

  return response.json() as Promise<GoogleTokenResponse>;
}

export async function fetchGoogleUser(accessToken: string): Promise<{
  id: string;
  email?: string;
  name?: string;
} | null> {
  const response = await fetch(
    "https://www.googleapis.com/oauth2/v2/userinfo",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!response.ok) {
    return null;
  }

  return response.json() as Promise<{
    id: string;
    email?: string;
    name?: string;
  }>;
}

export function googleAdsHeaders(
  accessToken: string,
  loginCustomerId?: string | null,
): HeadersInit {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "developer-token": getGoogleAdsDeveloperToken(),
    "Content-Type": "application/json",
  };

  const loginId =
    loginCustomerId === undefined
      ? getGoogleAdsLoginCustomerId()
      : loginCustomerId;
  if (loginId) {
    headers["login-customer-id"] = loginId;
  }

  return headers;
}

export type GoogleAdsCustomer = {
  id: string;
  name?: string;
  manager?: boolean;
  currencyCode?: string;
};

/** Lists Google Ads customer IDs the OAuth user can access. */
export async function listAccessibleGoogleAdsCustomers(
  accessToken: string,
): Promise<string[]> {
  const response = await fetch(
    `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}/customers:listAccessibleCustomers`,
    {
      method: "GET",
      headers: googleAdsHeaders(accessToken),
    },
  );

  if (!response.ok) {
    const body = await response.text();
    console.error("[adpilot] listAccessibleCustomers failed:", body);
    throw new Error(`Google Ads listAccessibleCustomers failed: ${body}`);
  }

  const payload = (await response.json()) as {
    resourceNames?: string[];
  };

  return (payload.resourceNames ?? [])
    .map((name) => name.replace(/^customers\//, ""))
    .filter(Boolean);
}

async function fetchGoogleAdsCustomerDetail(
  accessToken: string,
  customerId: string,
): Promise<GoogleAdsCustomer | null> {
  const response = await fetch(
    `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}/customers/${customerId}/googleAds:search`,
    {
      method: "POST",
      headers: googleAdsHeaders(accessToken),
      body: JSON.stringify({
        query:
          "SELECT customer.id, customer.descriptive_name, customer.currency_code, customer.manager FROM customer LIMIT 1",
      }),
    },
  );

  if (!response.ok) {
    return {
      id: customerId,
      name: `Google Ads ${customerId}`,
    };
  }

  const payload = (await response.json()) as {
    results?: Array<{
      customer?: {
        id?: string;
        descriptiveName?: string;
        currencyCode?: string;
        manager?: boolean;
      };
    }>;
  };

  const customer = payload.results?.[0]?.customer;
  return {
    id: String(customer?.id ?? customerId),
    name: customer?.descriptiveName ?? `Google Ads ${customerId}`,
    manager: customer?.manager ?? false,
    currencyCode: customer?.currencyCode,
  };
}

export async function fetchGoogleAdsCustomers(
  accessToken: string,
): Promise<GoogleAdsCustomer[]> {
  const ids = await listAccessibleGoogleAdsCustomers(accessToken);
  if (ids.length === 0) return [];

  const details = await Promise.all(
    ids.map((id) => fetchGoogleAdsCustomerDetail(accessToken, id)),
  );

  return details.filter((c): c is GoogleAdsCustomer => c != null);
}

export function googleAdsTokenHasAdwordsScope(scope: string | undefined): boolean {
  if (!scope) return true;
  return scope.split(/[ ,]+/).some((entry) => entry.includes("adwords"));
}
