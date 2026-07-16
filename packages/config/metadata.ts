import type { Metadata } from "next";

/** Default WALLS favicon served from each app's `app/icon.png` (synced via `pnpm sync:icons`). */
export const WALLS_DEFAULT_ICONS: NonNullable<Metadata["icons"]> = {
  icon: [{ url: "/icon.png", type: "image/png" }],
  shortcut: [{ url: "/icon.png", type: "image/png" }],
};

/**
 * Merge app metadata with shared WALLS defaults.
 * Pass `icons` to override the default favicon for a specific app.
 */
export function createWallsMetadata(metadata: Metadata): Metadata {
  const { icons, ...rest } = metadata;

  return {
    ...rest,
    icons: icons ?? WALLS_DEFAULT_ICONS,
  };
}
