import Constants from "expo-constants";

type WallieMobileExtra = {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  wallieApiUrl?: string;
  wallieWebUrl?: string;
};

function getExtra(): WallieMobileExtra {
  return (Constants.expoConfig?.extra ?? {}) as WallieMobileExtra;
}

export function getSupabaseUrl(): string {
  const url = getExtra().supabaseUrl;
  if (!url) {
    throw new Error(
      "Missing Supabase URL. Set NEXT_PUBLIC_SUPABASE_URL in the root .env.local.",
    );
  }
  return url;
}

export function getSupabaseAnonKey(): string {
  const key = getExtra().supabaseAnonKey;
  if (!key) {
    throw new Error(
      "Missing Supabase anon key. Set NEXT_PUBLIC_SUPABASE_ANON_KEY in the root .env.local.",
    );
  }
  return key;
}

/** Hetzner wallie-api base URL (POST /). */
export function getWallieApiUrl(): string {
  const url = getExtra().wallieApiUrl;
  if (!url) {
    throw new Error(
      "Missing Wallie API URL. Set NEXT_PUBLIC_WALLIE_API_URL in the root .env.local.",
    );
  }
  return url;
}

/** Wallie Next.js app — used for TTS / transcribe routes. */
export function getWallieWebUrl(): string {
  const url = getExtra().wallieWebUrl;
  if (!url) {
    throw new Error(
      "Missing Wallie web URL. Set NEXT_PUBLIC_WALLIE_URL in the root .env.local.",
    );
  }
  return url;
}
