import { NextResponse } from "next/server";

import { createClient } from "@walls/supabase/server";
import { PROJECTS_APP_SLUG, resolveActiveAccountId } from "@/lib/account-context";

const TASK_ASSIGNED_ALERT_KEY = "projects.task_assigned";
const TASK_BLOCKER_COMPLETED_ALERT_KEY = "projects.task_blocker_completed";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const accountId = await resolveActiveAccountId(user.id);
  if (!accountId) return NextResponse.json({ error: "No active account" }, { status: 400 });

  const { data, error } = await supabase
    .from("alert_subscriptions")
    .select("alert_key, notify_email, enabled")
    .eq("account_id", accountId)
    .eq("user_id", user.id)
    .eq("app_slug", PROJECTS_APP_SLUG)
    .in("alert_key", [TASK_ASSIGNED_ALERT_KEY, TASK_BLOCKER_COMPLETED_ALERT_KEY]);
  if (error) return NextResponse.json({ error: "Unable to load preferences" }, { status: 500 });

  const preferences = new Map((data ?? []).map((row) => [row.alert_key, row.enabled && row.notify_email]));
  return NextResponse.json({
    taskAssignedEmail: preferences.get(TASK_ASSIGNED_ALERT_KEY) ?? false,
    taskBlockerCompletedEmail: preferences.get(TASK_BLOCKER_COMPLETED_ALERT_KEY) ?? false,
  });
}

export async function PUT(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const accountId = await resolveActiveAccountId(user.id);
  if (!accountId) return NextResponse.json({ error: "No active account" }, { status: 400 });

  const body = (await request.json().catch(() => ({}))) as {
    taskAssignedEmail?: unknown;
    taskBlockerCompletedEmail?: unknown;
  };
  if (
    typeof body.taskAssignedEmail !== "boolean" &&
    typeof body.taskBlockerCompletedEmail !== "boolean"
  ) {
    return NextResponse.json({ error: "A notification preference must be a boolean" }, { status: 400 });
  }

  const updates: Array<[string, boolean]> = [];
  if (typeof body.taskAssignedEmail === "boolean") updates.push([TASK_ASSIGNED_ALERT_KEY, body.taskAssignedEmail]);
  if (typeof body.taskBlockerCompletedEmail === "boolean") updates.push([TASK_BLOCKER_COMPLETED_ALERT_KEY, body.taskBlockerCompletedEmail]);
  const { error } = await supabase.from("alert_subscriptions").upsert(
    updates.map(([alertKey, notifyEmail]) => ({
      account_id: accountId, user_id: user.id, app_slug: PROJECTS_APP_SLUG, alert_key: alertKey,
      notify_email: notifyEmail, notify_sms: false, enabled: notifyEmail, scope: {}, updated_at: new Date().toISOString(),
    })),
    { onConflict: "account_id,user_id,alert_key,app_slug" },
  );
  if (error) return NextResponse.json({ error: "Unable to save preferences" }, { status: 500 });

  return NextResponse.json({
    taskAssignedEmail: body.taskAssignedEmail,
    taskBlockerCompletedEmail: body.taskBlockerCompletedEmail,
  });
}
