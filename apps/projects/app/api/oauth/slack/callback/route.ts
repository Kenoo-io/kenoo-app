import { NextResponse, type NextRequest } from "next/server";

import { getAccountMembership, getCurrentUserId } from "@/lib/account-context";
import { exchangeSlackCode, SLACK_OAUTH_STATE_COOKIE, upsertSlackConnection } from "@/lib/slack";
import { parseSlackOAuthState } from "@/lib/start-slack-oauth";

function redirect(request: NextRequest, params: Record<string, string>) {
  const url = new URL("/settings/connections/slack", request.nextUrl.origin);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const response = NextResponse.redirect(url);
  response.cookies.set(SLACK_OAUTH_STATE_COOKIE, "", { httpOnly: true, secure: request.nextUrl.protocol === "https:", sameSite: "lax", path: "/", maxAge: 0 });
  return response;
}

export async function GET(request: NextRequest) {
  const state = request.nextUrl.searchParams.get("state");
  const code = request.nextUrl.searchParams.get("code");
  const saved = parseSlackOAuthState(request.cookies.get(SLACK_OAUTH_STATE_COOKIE)?.value);
  if (!state || !saved || state !== saved.nonce) return redirect(request, { error: "invalid_oauth_state" });
  if (request.nextUrl.searchParams.get("error")) return redirect(request, { error: "slack_authorization_cancelled" });

  const userId = await getCurrentUserId();
  if (!userId || userId !== saved.userId) return redirect(request, { error: "unauthorized" });
  if (!(await getAccountMembership(userId, saved.accountId))) return redirect(request, { error: "no_active_account" });
  if (!code) return redirect(request, { error: "slack_authorization_failed" });

  try {
    const oauth = await exchangeSlackCode(code, request.nextUrl.origin);
    await upsertSlackConnection({ accountId: saved.accountId, oauth });
    return redirect(request, { connected: "slack" });
  } catch (error) {
    console.error("[projects] Slack OAuth callback:", error);
    return redirect(request, { error: "slack_authorization_failed" });
  }
}
