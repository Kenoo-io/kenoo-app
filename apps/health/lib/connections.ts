export type SafeUserConnection = {
  id: string;
  provider: string | null;
  service: string | null;
  account_id: string | null;
  token_expiry: string | null;
  revoked_at: string | null;
  created_at: string;
  updated_at: string | null;
  token_payload?: {
    athlete_name?: string | null;
    profile_url?: string | null;
  } | null;
};

export const STRAVA_PROVIDER = "strava";
export const STRAVA_SERVICE = "strava";
