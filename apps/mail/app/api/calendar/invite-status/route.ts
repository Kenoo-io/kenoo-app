import { NextResponse } from "next/server";
import { createAdminClient } from "@walls/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ connected: false }, { status: 401 });

  const { data: appUser } = await admin
    .from("users")
    .select("id")
    .eq("email", user.email)
    .limit(1)
    .maybeSingle();
  if (!appUser?.id) return NextResponse.json({ connected: false });

  const { data } = await admin
    .from("user_connections")
    .select("id")
    .eq("user_id", appUser.id)
    .eq("provider", "google")
    .eq("service", "calendar")
    .is("revoked_at", null)
    .not("refresh_token", "is", null)
    .limit(1)
    .maybeSingle();

  return NextResponse.json({ connected: Boolean(data) });
}
