import type { SupabaseClient } from "@supabase/supabase-js";

const BATCH_SIZE = 100;

/**
 * Batch-load YouTube profile pictures from social_accounts for the given
 * profile IDs. Mirrors the deal-board fallback used when profiles.avatar_url
 * is empty.
 */
export async function fetchYoutubeProfilePicMap(
  supabase: SupabaseClient,
  profileIds: string[]
): Promise<Map<string, string>> {
  const uniqueIds = [...new Set(profileIds.filter(Boolean))];
  const map = new Map<string, string>();
  if (uniqueIds.length === 0) return map;

  const allSocialAccounts: Array<Record<string, unknown>> = [];

  for (let i = 0; i < uniqueIds.length; i += BATCH_SIZE) {
    const batch = uniqueIds.slice(i, i + BATCH_SIZE);
    const { data, error } = await supabase
      .from("social_accounts")
      .select("*")
      .in("profile_id", batch);

    if (error) {
      console.error(
        `Error fetching social accounts (batch ${i / BATCH_SIZE + 1}):`,
        error
      );
    } else if (data) {
      allSocialAccounts.push(...data);
    }
  }

  for (const account of allSocialAccounts) {
    const platform = (account.platform as string | undefined)?.toLowerCase();
    if (platform !== "youtube") continue;

    const profileId = account.profile_id as string | undefined;
    if (!profileId || map.has(profileId)) continue;

    const youtubePicUrl =
      (account.profile_pic_url as string | null) ||
      (account.avatar_url as string | null) ||
      (account.profile_picture_url as string | null) ||
      null;

    if (youtubePicUrl) {
      map.set(profileId, youtubePicUrl);
    }
  }

  return map;
}

/** Same fallback chain as the deal table: profiles.avatar_url → YouTube social pic. */
export function resolveTalentAvatarUrl(
  profileAvatarUrl: string | null | undefined,
  talentProfileId: string | null | undefined,
  youtubeProfilePicMap: Map<string, string>
): string | undefined {
  if (profileAvatarUrl) return profileAvatarUrl;
  if (talentProfileId) {
    const youtubePic = youtubeProfilePicMap.get(talentProfileId);
    if (youtubePic) return youtubePic;
  }
  return undefined;
}
