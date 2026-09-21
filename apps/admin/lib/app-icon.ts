/** Prefer the Kenoo-hosted app icon, retaining the legacy icon as a fallback. */
export function resolveAppIconUrl(
  kenooIconUrl: string | null | undefined,
  iconUrl: string | null | undefined,
): string | null {
  return kenooIconUrl?.trim() || iconUrl?.trim() || null;
}
