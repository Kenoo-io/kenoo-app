import { createHash, createSign } from "node:crypto";

export const GITHUB_PROVIDER = "github";
export const GITHUB_APP_SERVICE = "github_app";

export const GITHUB_APP_PERMISSIONS = [
  "Contents · Read-only",
  "Pull requests · Read-only",
  "Issues · Read-only",
  "Metadata · Read-only",
  "Commit statuses · Read-only",
] as const;

type GitHubInstallation = {
  id: number;
  app_id: number;
  account: {
    id: number;
    login: string;
    type: string;
    avatar_url?: string | null;
  };
  repository_selection: "all" | "selected";
  permissions: Record<string, string>;
  events: string[];
  suspended_at: string | null;
};

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name} configuration.`);
  return value;
}

export function getProjectsBaseUrl(): string {
  return process.env.NEXT_PUBLIC_PROJECTS_URL?.replace(/\/$/, "") || "http://localhost:3007";
}

export function getProjectsOriginFromRequest(request: {
  nextUrl: { origin: string };
}): string {
  const requestOrigin = request.nextUrl.origin.replace(/\/$/, "");
  try {
    const hostname = new URL(requestOrigin).hostname;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return requestOrigin;
    }
  } catch {
    // Fall back to the configured app origin.
  }
  return getProjectsBaseUrl();
}

export function getGitHubAppInstallationUrl(state: string): string {
  const slug = requiredEnvironment("GITHUB_APP_SLUG");
  const url = new URL(
    `https://github.com/apps/${encodeURIComponent(slug)}/installations/new`,
  );
  url.searchParams.set("state", state);
  return url.toString();
}

function getGitHubAppId(): string {
  return requiredEnvironment("GITHUB_APP_ID");
}

function getGitHubAppPrivateKey(): string {
  return requiredEnvironment("GITHUB_APP_PRIVATE_KEY").replace(/\\n/g, "\n");
}

function base64Url(value: string | Buffer): string {
  return Buffer.from(value).toString("base64url");
}

/** A short-lived JWT for GitHub App endpoints; never exposed to the browser. */
function createGitHubAppJwt(): string {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64Url(
    JSON.stringify({ iat: now - 60, exp: now + 9 * 60, iss: getGitHubAppId() }),
  );
  const unsignedToken = `${header}.${payload}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsignedToken);
  signer.end();
  return `${unsignedToken}.${signer.sign(getGitHubAppPrivateKey()).toString("base64url")}`;
}

export async function getGitHubAppInstallation(
  installationId: string,
): Promise<GitHubInstallation> {
  if (!/^\d+$/.test(installationId)) {
    throw new Error("Invalid GitHub installation id.");
  }

  const response = await fetch(
    `https://api.github.com/app/installations/${installationId}`,
    {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${createGitHubAppJwt()}`,
        "X-GitHub-Api-Version": "2026-03-10",
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(`GitHub installation verification failed (${response.status}).`);
  }

  const installation = (await response.json()) as GitHubInstallation;
  if (String(installation.app_id) !== getGitHubAppId()) {
    throw new Error("GitHub installation belongs to a different app.");
  }
  if (installation.suspended_at) {
    throw new Error("GitHub installation is suspended.");
  }
  return installation;
}

export function hashGitHubPermissions(
  permissions: Record<string, string>,
): string {
  return createHash("sha256")
    .update(JSON.stringify(Object.entries(permissions).sort(([a], [b]) => a.localeCompare(b))))
    .digest("hex");
}
