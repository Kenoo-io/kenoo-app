import { NextResponse } from "next/server";

import { createClient } from "@walls/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("project_notification_preferences")
    .select("task_assigned_email")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: "Unable to load preferences" }, { status: 500 });

  return NextResponse.json({ taskAssignedEmail: data?.task_assigned_email ?? true });
}

export async function PUT(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { taskAssignedEmail?: unknown };
  if (typeof body.taskAssignedEmail !== "boolean") {
    return NextResponse.json({ error: "taskAssignedEmail must be a boolean" }, { status: 400 });
  }

  const { error } = await supabase.from("project_notification_preferences").upsert(
    { user_id: user.id, task_assigned_email: body.taskAssignedEmail, updated_at: new Date().toISOString() },
    { onConflict: "user_id" },
  );
  if (error) return NextResponse.json({ error: "Unable to save preferences" }, { status: 500 });

  return NextResponse.json({ taskAssignedEmail: body.taskAssignedEmail });
}
