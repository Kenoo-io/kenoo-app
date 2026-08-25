/** Settings app origin — used for OAuth redirect URIs and post-connect redirects. */
export function getSettingsOrigin(): string {
  return (
    process.env.NEXT_PUBLIC_SETTINGS_URL?.replace(/\/$/, "") ??
    "http://localhost:3004"
  );
}

export function getGmailOAuthRedirectUri(): string {
  return `${getSettingsOrigin()}/api/google/gmail/callback`;
}

export function getCalendarOAuthRedirectUri(): string {
  return `${getSettingsOrigin()}/api/google/calendar/callback`;
}

export function getConnectPageUrl(): string {
  return `${getSettingsOrigin()}/connect`;
}

/**
 * Revokes a Google access or refresh token. Google treats this as disconnecting
 * the entire OAuth grant for this client, so reconnecting starts a fresh consent.
 */
export async function revokeGoogleOAuthToken(token: string): Promise<void> {
  const response = await fetch("https://oauth2.googleapis.com/revoke", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ token }),
  });

  if (response.ok || response.status === 400) {
    return;
  }

  const body = await response.text();
  console.error("[settings] Google token revoke failed:", response.status, body);
}

export async function revokeStoredGoogleTokens(
  connections: Array<{
    access_token?: string | null;
    refresh_token?: string | null;
  }>,
): Promise<void> {
  const tokens = new Set<string>();
  for (const connection of connections) {
    if (connection.refresh_token) tokens.add(connection.refresh_token);
    else if (connection.access_token) tokens.add(connection.access_token);
  }

  await Promise.all([...tokens].map((token) => revokeGoogleOAuthToken(token)));
}
