import { NextResponse, type NextRequest } from "next/server";
import { after } from "next/server";

import { upsertGoogleAdsConnections } from "@/lib/connections-server";
import {
  getCurrentUserId,
  resolveActiveAccountId,
} from "@/lib/account-context";
import { getAdDataScope } from "@/lib/ad-scope";
import { syncGoogleAdsConnectionsForAccount } from "@/lib/google-sync";
import {
  exchangeGoogleCodeForTokens,
  fetchGoogleAdsCustomers,
  fetchGoogleUser,
  getAdpilotOriginFromRequest,
  googleAdsTokenHasAdwordsScope,
  GOOGLE_ADS_SCOPES,
  type GoogleAdsCustomer,
} from "@/lib/google-ads-oauth";
import {
  GOOGLE_ADS_OAUTH_STATE_COOKIE,
  parseGoogleAdsOAuthCookie,
} from "@/lib/start-google-ads-oauth";

function redirectToGoogleSettings(
  request: NextRequest,
  params: Record<string, string>,
) {
  const settingsUrl = new URL(
    "/settings/connections/google",
    getAdpilotOriginFromRequest(request),
  );
  for (const [key, value] of Object.entries(params)) {
    settingsUrl.searchParams.set(key, value);
  }

  const response = NextResponse.redirect(settingsUrl);
  response.cookies.set(GOOGLE_ADS_OAUTH_STATE_COOKIE, "", {
    httpOnly: true,
    secure: request.nextUrl.protocol === "https:",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}

export async function GET(request: NextRequest) {
  const oauthError = request.nextUrl.searchParams.get("error");
  if (oauthError) {
    return redirectToGoogleSettings(request, { error: oauthError });
  }

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const saved = parseGoogleAdsOAuthCookie(
    request.cookies.get(GOOGLE_ADS_OAUTH_STATE_COOKIE)?.value,
  );

  if (!code || !state || !saved || state !== saved.nonce) {
    return redirectToGoogleSettings(request, { error: "invalid_oauth_state" });
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    return redirectToGoogleSettings(request, { error: "unauthorized" });
  }

  const accountId = await resolveActiveAccountId(userId);
  if (!accountId) {
    return redirectToGoogleSettings(request, { error: "no_active_account" });
  }

  try {
    const tokens = await exchangeGoogleCodeForTokens(code, saved.redirectUri);
    if (!tokens.access_token) {
      throw new Error("Google token response missing access_token");
    }
    if (!googleAdsTokenHasAdwordsScope(tokens.scope)) {
      return redirectToGoogleSettings(request, {
        error: "missing_adwords_scope",
      });
    }
    if (!tokens.refresh_token) {
      throw new Error(
        "Google token response missing refresh_token - revoke Kenoo access in Google Account and try again",
      );
    }

    const providerUser = await fetchGoogleUser(tokens.access_token);

    let customers: GoogleAdsCustomer[] = [];
    try {
      customers = await fetchGoogleAdsCustomers(tokens.access_token);
    } catch (listError) {
      console.error(
        "[adpilot] Google Ads account listing after OAuth:",
        listError,
      );
    }

    const expiresIn = tokens.expires_in ?? 3600;
    const tokenExpiry = new Date(Date.now() + expiresIn * 1000).toISOString();

    await upsertGoogleAdsConnections({
      accountId,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      tokenExpiry,
      scopes: tokens.scope ?? GOOGLE_ADS_SCOPES.join(" "),
      tokenResponse: tokens,
      providerUser,
      customers,
    });

    if (customers.length > 0) {
      after(async () => {
        try {
          const scope = await getAdDataScope();
          if (scope) {
            await syncGoogleAdsConnectionsForAccount(scope);
          }
        } catch (syncError) {
          console.error("[adpilot] Google Ads sync after OAuth:", syncError);
        }
      });
    }

    return redirectToGoogleSettings(request, {
      connected: "google",
      ...(customers.length === 0 ? { warning: "no_ads_accounts" } : { syncing: "1" }),
    });
  } catch (err) {
    console.error("[adpilot] Google Ads OAuth callback:", err);
    return redirectToGoogleSettings(request, { error: "google_oauth_failed" });
  }
}
