import { GOOGLE_PROVIDER, META_PROVIDER } from "@/lib/connections";

export function isGoogleAdsProvider(provider: string | null | undefined): boolean {
  return (provider ?? "").toLowerCase() === GOOGLE_PROVIDER;
}

export function isMetaAdsProvider(provider: string | null | undefined): boolean {
  return (provider ?? "").toLowerCase() === META_PROVIDER;
}

export function adsPlatformLabel(provider: string | null | undefined): string {
  if (isGoogleAdsProvider(provider)) return "Google Ads";
  if (isMetaAdsProvider(provider)) return "Meta";
  return provider?.trim() ? provider : "Ads";
}

/** Middle hierarchy layer: Meta ad set vs Google ad group. */
export function midLevelEntityLabel(
  provider: string | null | undefined,
  options?: { plural?: boolean; lowercase?: boolean },
): string {
  const plural = options?.plural === true;
  const label = isGoogleAdsProvider(provider)
    ? plural
      ? "Ad groups"
      : "Ad group"
    : plural
      ? "Ad sets"
      : "Ad set";
  return options?.lowercase ? label.toLowerCase() : label;
}

/** List tab that includes both Meta ad sets and Google ad groups. */
export const MID_LEVEL_LIST_TAB_LABEL = "Ad Sets";
