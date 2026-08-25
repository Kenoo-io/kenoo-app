import { randomBytes } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";

import {
  buildGoogleAdsAuthorizeUrl,
  getAdpilotOriginFromRequest,
  getGoogleAdsRedirectUri,
} from "@/lib/google-ads-oauth";
import { getCurrentUserId } from "@/lib/account-context";

export const GOOGLE_ADS_OAUTH_STATE_COOKIE = "google_ads_oauth_state";

export type GoogleAdsOAuthCookie = {
  nonce: string;
  redirectUri: string;
};

export function serializeGoogleAdsOAuthCookie(
  value: GoogleAdsOAuthCookie,
): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

export function parseGoogleAdsOAuthCookie(
  raw: string | undefined,
): GoogleAdsOAuthCookie | null {
  if (!raw) return null;

  if (/^[a-f0-9]{32,}$/i.test(raw)) {
    return { nonce: raw, redirectUri: getGoogleAdsRedirectUri() };
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(raw, "base64url").toString("utf8"),
    ) as GoogleAdsOAuthCookie;
    if (parsed?.nonce && parsed?.redirectUri) return parsed;
  } catch {
    return null;
  }

  return null;
}

function oauthCookieOptions(request: NextRequest) {
  return {
    httpOnly: true,
    secure: request.nextUrl.protocol === "https:",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 10,
  };
}

/** Starts Google Ads OAuth - used by `/api/oauth/google/login`. */
export async function startGoogleAdsOAuthLogin(
  request: NextRequest,
): Promise<NextResponse> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const origin = getAdpilotOriginFromRequest(request);
  const redirectUri = getGoogleAdsRedirectUri(origin);
  const nonce = randomBytes(24).toString("hex");

  const response = NextResponse.redirect(
    buildGoogleAdsAuthorizeUrl(nonce, redirectUri),
  );
  response.cookies.set(
    GOOGLE_ADS_OAUTH_STATE_COOKIE,
    serializeGoogleAdsOAuthCookie({ nonce, redirectUri }),
    oauthCookieOptions(request),
  );
  return response;
}
