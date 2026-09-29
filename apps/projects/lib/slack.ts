import { createAdminClient } from "@walls/supabase/admin";

export const SLACK_PROVIDER = "slack";
export const SLACK_SERVICE = "workspace";
export const SLACK_OAUTH_STATE_COOKIE = "slack_oauth_state";
export const SLACK_SCOPES = ["chat:write", "channels:read", "groups:read", "users:read", "users:read.email"] as const;

type SlackOAuthResponse = {
  ok: boolean;
  error?: string;
  access_token?: string;
  scope?: string;
  team?: { id?: string; name?: string };
  bot_user_id?: string;
};

type SlackChannel = {
  id: string;
  name: string;
  is_private?: boolean;
  is_archived?: boolean;
};

export type SlackUser = {
  id: string;
  name?: string;
  real_name?: string;
  deleted?: boolean;
  is_bot?: boolean;
  is_app_user?: boolean;
  profile?: { email?: string; display_name?: string; real_name?: string };
};

function getSlackRedirectUri(fallbackOrigin?: string): string {
  return process.env.SLACK_REDIRECT_URI || `${fallbackOrigin ?? process.env.NEXT_PUBLIC_PROJECTS_URL}/api/oauth/slack/callback`;
}

export function getSlackAuthorizeUrl(state: string, fallbackOrigin?: string): string {
  const clientId = process.env.SLACK_CLIENT_ID;
  if (!clientId) throw new Error("Slack is not configured");

  const url = new URL("https://slack.com/oauth/v2/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("scope", SLACK_SCOPES.join(","));
  url.searchParams.set("redirect_uri", getSlackRedirectUri(fallbackOrigin));
  url.searchParams.set("state", state);
  return url.toString();
}

export async function exchangeSlackCode(code: string, fallbackOrigin?: string): Promise<SlackOAuthResponse> {
  const clientId = process.env.SLACK_CLIENT_ID;
  const clientSecret = process.env.SLACK_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Slack is not configured");

  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: getSlackRedirectUri(fallbackOrigin),
  });
  const response = await fetch("https://slack.com/api/oauth.v2.access", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  const result = (await response.json()) as SlackOAuthResponse;
  if (!response.ok || !result.ok || !result.access_token || !result.team?.id) {
    throw new Error(result.error || "Slack authorization failed");
  }
  return result;
}

export async function upsertSlackConnection(input: {
  accountId: string;
  oauth: SlackOAuthResponse;
}): Promise<{ id: string }> {
  const admin = createAdminClient();
  const teamId = input.oauth.team?.id;
  if (!teamId || !input.oauth.access_token) throw new Error("Slack authorization did not return a workspace");

  const row = {
    account_id: input.accountId,
    provider: SLACK_PROVIDER,
    service: SLACK_SERVICE,
    provider_account_id: teamId,
    access_token: input.oauth.access_token,
    refresh_token: "",
    token_expiry: null,
    token_payload: {
      team_id: teamId,
      team_name: input.oauth.team?.name ?? null,
      bot_user_id: input.oauth.bot_user_id ?? null,
      scope: input.oauth.scope ?? null,
    },
    scope_hash: input.oauth.scope ?? null,
    revoked_at: null,
    updated_at: new Date().toISOString(),
  };

  const { data: existing, error: findError } = await admin
    .from("account_connections")
    .select("id")
    .eq("account_id", input.accountId)
    .eq("provider", SLACK_PROVIDER)
    .eq("service", SLACK_SERVICE)
    .eq("provider_account_id", teamId)
    .maybeSingle();
  if (findError) throw findError;

  if (existing?.id) {
    const { error } = await admin.from("account_connections").update(row).eq("id", existing.id);
    if (error) throw error;
    return { id: existing.id as string };
  }

  const { data, error } = await admin.from("account_connections").insert(row).select("id").single();
  if (error || !data) throw error ?? new Error("Unable to save Slack connection");
  return { id: data.id as string };
}

export async function slackApi<T>(token: string, method: string, body?: Record<string, unknown>): Promise<T> {
  const response = await fetch(`https://slack.com/api/${method}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify(body ?? {}),
    cache: "no-store",
  });
  const responseText = await response.text();
  let result: T & { ok?: boolean; error?: string };
  try {
    result = (responseText ? JSON.parse(responseText) : {}) as T & { ok?: boolean; error?: string };
  } catch {
    throw new Error(`Slack ${method} returned an invalid response (${response.status})`);
  }
  if (!response.ok || result.ok === false) throw new Error(result.error || `Slack ${method} failed`);
  return result;
}

export async function listSlackChannels(token: string): Promise<SlackChannel[]> {
  const channels: SlackChannel[] = [];
  let cursor: string | undefined;
  do {
    const result = await slackApi<{ ok: boolean; channels?: SlackChannel[]; response_metadata?: { next_cursor?: string } }>(
      token,
      "conversations.list",
      { types: "public_channel,private_channel", exclude_archived: true, limit: 200, ...(cursor ? { cursor } : {}) },
    );
    channels.push(...(result.channels ?? []));
    cursor = result.response_metadata?.next_cursor || undefined;
  } while (cursor);
  return channels;
}

export async function listSlackUsers(token: string): Promise<SlackUser[]> {
  const users: SlackUser[] = [];
  let cursor: string | undefined;
  do {
    const result = await slackApi<{ ok: boolean; members?: SlackUser[]; response_metadata?: { next_cursor?: string } }>(
      token,
      "users.list",
      { limit: 200, ...(cursor ? { cursor } : {}) },
    );
    users.push(...(result.members ?? []));
    cursor = result.response_metadata?.next_cursor || undefined;
  } while (cursor);
  return users.filter((user) => !user.deleted && !user.is_bot && !user.is_app_user);
}

export async function sendSlackMessage(token: string, channel: string, text: string): Promise<void> {
  await slackApi(token, "chat.postMessage", { channel, text });
}
