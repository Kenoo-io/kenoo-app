import { NextResponse, type NextRequest } from "next/server";

import { startGoogleAdsOAuthLogin } from "@/lib/start-google-ads-oauth";

/** Google Ads OAuth entry: https://adpilot.kenoo.io/api/oauth/google/login */
export async function GET(request: NextRequest) {
  try {
    return await startGoogleAdsOAuthLogin(request);
  } catch (err) {
    console.error("[adpilot] Google Ads OAuth login:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Google Ads OAuth is not configured",
      },
      { status: 500 },
    );
  }
}
