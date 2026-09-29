import { NextResponse, type NextRequest } from "next/server";

import { startSlackOAuth } from "@/lib/start-slack-oauth";

export async function GET(request: NextRequest) {
  try {
    return await startSlackOAuth(request);
  } catch (error) {
    console.error("[projects] Slack OAuth start:", error);
    const url = new URL("/settings/connections/slack", request.nextUrl.origin);
    url.searchParams.set("error", "slack_not_configured");
    return NextResponse.redirect(url);
  }
}
