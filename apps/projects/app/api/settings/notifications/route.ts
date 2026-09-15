import { NextResponse } from "next/server";

import { createClient } from "@walls/supabase/server";
import { PROJECTS_APP_SLUG, resolveActiveAccountId } from "@/lib/account-context";

const TASK_ASSIGNED_ALERT_KEY = "projects.task_assigned";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const accountId = await resolveActiveAccountId(user.id);
  if (!accountId) return NextResponse.json({ error: "No active account" }, { status: 400 });

  const { data, error } = await supabase
    .from("alert_subscriptions")
    .select("notify_email, enabled")
    .eq("account_id", accountId)
    .eq("user_id", user.id)
    .eq("app_slug", PROJECTS_APP_SLUG)
    .eq("alert_key", TASK_ASSIGNED_ALERT_KEY)
    .maybeSingle();
  if (error) return NextResponse.json({ error: "Unable to load preferences" }, { status: 500 });

  return NextResponse.json({ taskAssignedEmail: data ? data.enabled && data.notify_email : true });
}

export async function PUT(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const accountId = await resolveActiveAccountId(user.id);
  if (!accountId) return NextResponse.json({ error: "No active account" }, { status: 400 });

  const body = (await request.json().catch(() => ({}))) as { taskAssignedEmail?: unknown };
  if (typeof body.taskAssignedEmail !== "boolean") {
    return NextResponse.json({ error: "taskAssignedEmail must be a boolean" }, { status: 400 });
  }

  const { error } = await supabase.from("alert_subscriptions").upsert(
    {
      account_id: accountId,
      user_id: user.id,
      app_slug: PROJECTS_APP_SLUG,
      alert_key: TASK_ASSIGNED_ALERT_KEY,
      notify_email: body.taskAssignedEmail,
      notify_sms: false,
      enabled: body.taskAssignedEmail,
      scope: {},
      updated_at: new Date().toISOString(),
    },
    { onConflict: "account_id,user_id,alert_key,app_slug" },
  );
  if (error) return NextResponse.json({ error: "Unable to save preferences" }, { status: 500 });

  return NextResponse.json({ taskAssignedEmail: body.taskAssignedEmail });
}
