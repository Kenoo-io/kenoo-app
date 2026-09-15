import { NextResponse, type NextRequest } from "next/server";

import { startGitHubAppInstallation } from "@/lib/start-github-app-installation";

/** GitHub App installation entry: `/api/oauth/github/login`. */
export async function GET(request: NextRequest) {
  try {
    return await startGitHubAppInstallation(request);
  } catch (error) {
    console.error("[projects] GitHub App installation start:", error);
    const url = new URL("/settings/connections/github", request.nextUrl.origin);
    url.searchParams.set("error", "github_not_configured");
    return NextResponse.redirect(url);
  }
}
