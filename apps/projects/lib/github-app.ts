import { createHash, createSign } from "node:crypto";

export const GITHUB_PROVIDER = "github";
export const GITHUB_APP_SERVICE = "github_app";

export const GITHUB_APP_PERMISSIONS = [
  "Contents · Read & write",
  "Pull requests · Read-only",
  "Issues · Read-only",
  "Metadata · Read-only",
  "Commit statuses · Read-only",
  "Checks · Read-only",
  "Deployments · Read-only",
] as const;

export type GitHubRepository = {
  full_name: string;
  default_branch: string;
  html_url: string;
};

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

function githubHeaders(token: string) {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2026-03-10",
  };
}

/** Minted on demand and deliberately never stored. */
export async function createGitHubInstallationToken(installationId: string): Promise<string> {
  if (!/^\d+$/.test(installationId)) throw new Error("Invalid GitHub installation id.");
  const response = await fetch(
    `https://api.github.com/app/installations/${installationId}/access_tokens`,
    { method: "POST", headers: githubHeaders(createGitHubAppJwt()), cache: "no-store" },
  );
  if (!response.ok) throw new Error(`GitHub installation token failed (${response.status}).`);
  const payload = (await response.json()) as { token?: string };
  if (!payload.token) throw new Error("GitHub did not return an installation token.");
  return payload.token;
}

export async function listGitHubInstallationRepositories(installationId: string): Promise<GitHubRepository[]> {
  const token = await createGitHubInstallationToken(installationId);
  const repositories: GitHubRepository[] = [];
  for (let page = 1; page <= 10; page += 1) {
    const response = await fetch(
      `https://api.github.com/installation/repositories?per_page=100&page=${page}`,
      { headers: githubHeaders(token), cache: "no-store" },
    );
    if (!response.ok) throw new Error(`GitHub repository list failed (${response.status}).`);
    const payload = (await response.json()) as { repositories?: GitHubRepository[] };
    const batch = payload.repositories ?? [];
    repositories.push(...batch);
    if (batch.length < 100) break;
  }
  return repositories.sort((a, b) => a.full_name.localeCompare(b.full_name));
}

export async function getGitHubRepositoryBranch(installationId: string, repositoryFullName: string, branch?: string) {
  const [owner, repo] = repositoryFullName.split("/");
  if (!owner || !repo || repositoryFullName.split("/").length !== 2) throw new Error("Invalid repository.");
  const token = await createGitHubInstallationToken(installationId);
  const repositoryResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers: githubHeaders(token), cache: "no-store",
  });
  if (!repositoryResponse.ok) throw new Error(`GitHub repository lookup failed (${repositoryResponse.status}).`);
  const repository = (await repositoryResponse.json()) as GitHubRepository;
  const selectedBranch = branch || repository.default_branch;
  const refResponse = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(selectedBranch)}`,
    { headers: githubHeaders(token), cache: "no-store" },
  );
  if (!refResponse.ok) throw new Error(`GitHub branch lookup failed (${refResponse.status}).`);
  const ref = (await refResponse.json()) as { object?: { sha?: string } };
  if (!ref.object?.sha) throw new Error("GitHub branch has no commit SHA.");
  return { repository, branch: selectedBranch, sha: ref.object.sha };
}

export async function listGitHubRepositoryBranches(installationId: string, repositoryFullName: string): Promise<string[]> {
  const [owner, repo] = repositoryFullName.split("/");
  if (!owner || !repo || repositoryFullName.split("/").length !== 2) throw new Error("Invalid repository.");
  const token = await createGitHubInstallationToken(installationId);
  const branches: string[] = [];
  for (let page = 1; page <= 10; page += 1) {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/branches?per_page=100&page=${page}`, { headers: githubHeaders(token), cache: "no-store" });
    if (!response.ok) throw new Error(`GitHub branch list failed (${response.status}).`);
    const batch = (await response.json()) as { name?: string }[];
    branches.push(...batch.map((item) => item.name).filter((name): name is string => Boolean(name)));
    if (batch.length < 100) break;
  }
  return branches.sort((a, b) => a.localeCompare(b));
}

export async function createGitHubBranchRef(input: { installationId: string; repositoryFullName: string; branchName: string; sha: string }) {
  const [owner, repo] = input.repositoryFullName.split("/");
  if (!owner || !repo || !input.branchName || !/^[0-9a-f]{40}$/i.test(input.sha)) throw new Error("Invalid GitHub branch request.");
  const token = await createGitHubInstallationToken(input.installationId);
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs`, {
    method: "POST",
    headers: { ...githubHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify({ ref: `refs/heads/${input.branchName}`, sha: input.sha }),
    cache: "no-store",
  });
  if (response.ok) return;
  if (response.status === 422) {
    const existing = await getGitHubRepositoryBranch(input.installationId, input.repositoryFullName, input.branchName).catch(() => null);
    if (existing?.sha) return;
  }
  throw new Error(`GitHub branch creation failed (${response.status}).`);
}

export async function deleteGitHubBranchRef(input: { installationId: string; repositoryFullName: string; branchName: string }) {
  const [owner, repo] = input.repositoryFullName.split("/");
  if (!owner || !repo || !input.branchName || input.repositoryFullName.split("/").length !== 2) throw new Error("Invalid GitHub branch deletion request.");
  const token = await createGitHubInstallationToken(input.installationId);
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${encodeURIComponent(input.branchName)}`, {
    method: "DELETE", headers: githubHeaders(token), cache: "no-store",
  });
  // A manually deleted branch is already in the desired state.
  if (!response.ok && response.status !== 404) throw new Error(`GitHub branch deletion failed (${response.status}).`);
}

/** Checks GitHub directly so webhook delivery order cannot misclassify a merged branch as abandoned. */
export async function hasMergedGitHubPullRequest(input: { installationId: string; repositoryFullName: string; branchName: string }): Promise<boolean> {
  const [owner, repo] = input.repositoryFullName.split("/");
  if (!owner || !repo || input.repositoryFullName.split("/").length !== 2 || !input.branchName) throw new Error("Invalid GitHub pull request lookup.");
  const token = await createGitHubInstallationToken(input.installationId);
  const params = new URLSearchParams({ state: "closed", head: `${owner}:${input.branchName}`, per_page: "100" });
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls?${params}`, {
    headers: githubHeaders(token), cache: "no-store",
  });
  if (!response.ok) throw new Error(`GitHub pull request lookup failed (${response.status}).`);
  const pullRequests = (await response.json()) as { merged_at?: string | null }[];
  return pullRequests.some((pullRequest) => Boolean(pullRequest.merged_at));
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

/** Uninstalls this GitHub App from the installation's account. */
export async function uninstallGitHubAppInstallation(
  installationId: string,
): Promise<void> {
  if (!/^\d+$/.test(installationId)) {
    throw new Error("Invalid GitHub installation id.");
  }

  const response = await fetch(
    `https://api.github.com/app/installations/${installationId}`,
    {
      method: "DELETE",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${createGitHubAppJwt()}`,
        "X-GitHub-Api-Version": "2026-03-10",
      },
      cache: "no-store",
    },
  );

  // A manually removed installation is already in the desired state.
  if (!response.ok && response.status !== 404) {
    throw new Error(`GitHub installation removal failed (${response.status}).`);
  }
}

export function hashGitHubPermissions(
  permissions: Record<string, string>,
): string {
  return createHash("sha256")
    .update(JSON.stringify(Object.entries(permissions).sort(([a], [b]) => a.localeCompare(b))))
    .digest("hex");
}
