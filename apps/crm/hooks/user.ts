import type { User as SupabaseUser } from "@supabase/supabase-js";

export type User = {
  id: string;
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  phoneNumber: string | null;
  emailVerified: boolean;
  providerId?: string;
};

export const toUser = (supabaseUser: SupabaseUser): User => {
  const userMetadata = supabaseUser.user_metadata || {};
  const appMetadata = supabaseUser.app_metadata || {};

  return {
    id: supabaseUser.id,
    uid: supabaseUser.id,
    email: supabaseUser.email ?? null,
    displayName:
      userMetadata.full_name ||
      userMetadata.name ||
      userMetadata.display_name ||
      null,
    photoURL: userMetadata.avatar_url || userMetadata.picture || null,
    phoneNumber: supabaseUser.phone ?? null,
    emailVerified: supabaseUser.email_confirmed_at !== null,
    providerId: appMetadata.provider,
  };
};
