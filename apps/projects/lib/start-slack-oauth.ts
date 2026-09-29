import { randomBytes } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";

import { getCurrentUserId, resolveActiveAccountId } from "@/lib/account-context";
import { getSlackAuthorizeUrl, SLACK_OAUTH_STATE_COOKIE } from "@/lib/slack";

type SlackOAuthState = { nonce: string; userId: string; accountId: string };

function serialize(value: SlackOAuthState): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

export function parseSlackOAuthState(raw: string | undefined): SlackOAuthState | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as SlackOAuthState;
    return value?.nonce && value?.userId && value?.accountId ? value : null;
  } catch {
    return null;
  }
}

export async function startSlackOAuth(request: NextRequest): Promise<NextResponse> {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const accountId = await resolveActiveAccountId(userId);
  if (!accountId) return NextResponse.json({ error: "No active account" }, { status: 400 });

  const nonce = randomBytes(24).toString("base64url");
  const response = NextResponse.redirect(getSlackAuthorizeUrl(nonce, request.nextUrl.origin));
  response.cookies.set(SLACK_OAUTH_STATE_COOKIE, serialize({ nonce, userId, accountId }), {
    httpOnly: true,
    secure: request.nextUrl.protocol === "https:",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  });
  return response;
}
