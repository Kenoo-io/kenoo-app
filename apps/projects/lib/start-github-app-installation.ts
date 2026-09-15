import { randomBytes } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";

import {
  getCurrentUserId,
  resolveActiveAccountId,
} from "@/lib/account-context";
import { getGitHubAppInstallationUrl } from "@/lib/github-app";

export const GITHUB_APP_INSTALLATION_STATE_COOKIE =
  "github_app_installation_state";

type GitHubAppInstallationState = {
  nonce: string;
  userId: string;
  accountId: string;
};

function serializeState(value: GitHubAppInstallationState): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

export function parseGitHubAppInstallationState(
  raw: string | undefined,
): GitHubAppInstallationState | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(
      Buffer.from(raw, "base64url").toString("utf8"),
    ) as GitHubAppInstallationState;
    if (value?.nonce && value?.userId && value?.accountId) return value;
  } catch {
    // Treat malformed or stale state as invalid.
  }
  return null;
}

function stateCookieOptions(request: NextRequest) {
  return {
    httpOnly: true,
    secure: request.nextUrl.protocol === "https:",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 10,
  };
}

export async function startGitHubAppInstallation(
  request: NextRequest,
): Promise<NextResponse> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accountId = await resolveActiveAccountId(userId);
  if (!accountId) {
    return NextResponse.json({ error: "No active account" }, { status: 400 });
  }

  const nonce = randomBytes(24).toString("base64url");
  const response = NextResponse.redirect(getGitHubAppInstallationUrl(nonce));
  response.cookies.set(
    GITHUB_APP_INSTALLATION_STATE_COOKIE,
    serializeState({ nonce, userId, accountId }),
    stateCookieOptions(request),
  );
  return response;
}
