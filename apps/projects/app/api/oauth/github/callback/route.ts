import { NextResponse, type NextRequest } from "next/server";

import {
  getAccountMembership,
  getCurrentUserId,
} from "@/lib/account-context";
import { upsertGitHubAppInstallation } from "@/lib/github-connections-server";
import {
  getGitHubAppInstallation,
  getProjectsOriginFromRequest,
} from "@/lib/github-app";
import {
  GITHUB_APP_INSTALLATION_STATE_COOKIE,
  parseGitHubAppInstallationState,
} from "@/lib/start-github-app-installation";

function redirectToGitHubSettings(
  request: NextRequest,
  params: Record<string, string>,
) {
  const url = new URL(
    "/settings/connections/github",
    getProjectsOriginFromRequest(request),
  );
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  const response = NextResponse.redirect(url);
  response.cookies.set(GITHUB_APP_INSTALLATION_STATE_COOKIE, "", {
    httpOnly: true,
    secure: request.nextUrl.protocol === "https:",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}

export async function GET(request: NextRequest) {
  const state = request.nextUrl.searchParams.get("state");
  const installationId = request.nextUrl.searchParams.get("installation_id");
  const setupAction = request.nextUrl.searchParams.get("setup_action");
  const githubError = request.nextUrl.searchParams.get("error");
  const saved = parseGitHubAppInstallationState(
    request.cookies.get(GITHUB_APP_INSTALLATION_STATE_COOKIE)?.value,
  );

  if (githubError) {
    return redirectToGitHubSettings(request, { error: "github_authorization_failed" });
  }
  if (!state || !saved || state !== saved.nonce) {
    return redirectToGitHubSettings(request, { error: "invalid_oauth_state" });
  }
  if (!installationId) {
    return redirectToGitHubSettings(request, {
      error: setupAction === "cancel" ? "github_installation_cancelled" : "github_installation_failed",
    });
  }

  const userId = await getCurrentUserId();
  if (!userId || userId !== saved.userId) {
    return redirectToGitHubSettings(request, { error: "unauthorized" });
  }
  const membership = await getAccountMembership(userId, saved.accountId);
  if (!membership) {
    return redirectToGitHubSettings(request, { error: "no_active_account" });
  }

  try {
    // The callback parameter is untrusted. Verify it using a server-only App JWT
    // before associating this installation with the saved Kenoo account.
    const installation = await getGitHubAppInstallation(installationId);
    await upsertGitHubAppInstallation({
      accountId: saved.accountId,
      installation,
    });
    return redirectToGitHubSettings(request, { connected: "github" });
  } catch (error) {
    console.error("[projects] GitHub App installation callback:", error);
    return redirectToGitHubSettings(request, { error: "github_installation_failed" });
  }
}
