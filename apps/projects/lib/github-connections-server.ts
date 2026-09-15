import { createAdminClient } from "@walls/supabase/admin";
import { createClient } from "@walls/supabase/server";

import {
  GITHUB_APP_SERVICE,
  GITHUB_PROVIDER,
  hashGitHubPermissions,
  type getGitHubAppInstallation,
} from "@/lib/github-app";

export type SafeGitHubConnection = {
  id: string;
  provider_account_id: string | null;
  created_at: string;
  token_payload: {
    account_login?: string | null;
    account_type?: string | null;
    repository_selection?: "all" | "selected" | null;
  } | null;
};

type GitHubInstallation = Awaited<ReturnType<typeof getGitHubAppInstallation>>;

export async function getSafeGitHubConnectionForAccount(
  accountId: string,
): Promise<SafeGitHubConnection | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("account_connections")
    .select("id, provider_account_id, created_at, token_payload")
    .eq("account_id", accountId)
    .eq("provider", GITHUB_PROVIDER)
    .eq("service", GITHUB_APP_SERVICE)
    .is("revoked_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[projects] get GitHub connection:", error);
    return null;
  }
  return (data as SafeGitHubConnection | null) ?? null;
}

export async function upsertGitHubAppInstallation(input: {
  accountId: string;
  installation: GitHubInstallation;
}): Promise<void> {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const providerAccountId = String(input.installation.id);
  const row = {
    account_id: input.accountId,
    provider: GITHUB_PROVIDER,
    service: GITHUB_APP_SERVICE,
    provider_account_id: providerAccountId,
    // GitHub App installation tokens are minted only when server work needs one.
    // Do not persist an installation token from this setup flow.
    access_token: "",
    refresh_token: "",
    token_expiry: null,
    token_payload: {
      account_id: input.installation.account.id,
      account_login: input.installation.account.login,
      account_type: input.installation.account.type,
      avatar_url: input.installation.account.avatar_url ?? null,
      repository_selection: input.installation.repository_selection,
      permissions: input.installation.permissions,
      events: input.installation.events,
    },
    scope_hash: hashGitHubPermissions(input.installation.permissions),
    last_token_refresh: now,
    updated_at: now,
    revoked_at: null,
  };

  const { data: existing, error: findError } = await admin
    .from("account_connections")
    .select("id")
    .eq("account_id", input.accountId)
    .eq("provider", GITHUB_PROVIDER)
    .eq("service", GITHUB_APP_SERVICE)
    .eq("provider_account_id", providerAccountId)
    .maybeSingle();
  if (findError) throw findError;

  const { error } = existing?.id
    ? await admin.from("account_connections").update(row).eq("id", existing.id)
    : await admin.from("account_connections").insert(row);
  if (error) throw error;
}

/** Marks an existing installation unavailable after GitHub suspends or removes it. */
export async function setGitHubInstallationConnectionActive(input: {
  installationId: string;
  active: boolean;
}): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("account_connections")
    .update({
      revoked_at: input.active ? null : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("provider", GITHUB_PROVIDER)
    .eq("service", GITHUB_APP_SERVICE)
    .eq("provider_account_id", input.installationId);
  if (error) throw error;
}
