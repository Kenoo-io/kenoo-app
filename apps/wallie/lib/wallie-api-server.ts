/**
 * Server-only Wallie backend URL helpers.
 * Browser code must call same-origin `/api/walli/*` routes; chat proxies to Hetzner.
 */

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

/** Base URL of the remote wallie-api service on Hetzner (POST /). */
export function getWallieApiBaseUrlOrNull(): string | null {
  const url = process.env.WALLIE_API_URL ?? process.env.NEXT_PUBLIC_WALLIE_API_URL;
  if (!url?.trim()) return null;
  return normalizeBaseUrl(url.trim());
}

export function isRemoteWallieBackendConfigured(): boolean {
  return getWallieApiBaseUrlOrNull() != null;
}

/** Hetzner wallie-api exposes chat at POST / on the base URL (not /api/walli/...). */
export function getWallieChatUrl(): string | null {
  return getWallieApiBaseUrlOrNull();
}
