import { NextResponse } from "next/server";
import { headers } from "next/headers";

import { createAdminClient } from "@walls/supabase/admin";
import { createClient } from "@walls/supabase/server";

import { sendTaskAssignmentEmail } from "@/lib/task-assignment-email";

type AssignmentRow = {
  id: string;
  task_id: string;
  user_id: string;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    taskId?: unknown;
    assigneeId?: unknown;
  };
  if (typeof body.taskId !== "string" || typeof body.assigneeId !== "string") {
    return NextResponse.json({ error: "taskId and assigneeId are required" }, { status: 400 });
  }

  // Use the requesting user's session to ensure they can actually access this task.
  const sessionClient = await createClient();
  const { data: { user: actor } } = await sessionClient.auth.getUser();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [{ data: task, error: taskError }, { data: assignment, error: assignmentError }] =
    await Promise.all([
      sessionClient
        .from("project_tasks")
        .select("id, title, project_id, projects(name)")
        .eq("id", body.taskId)
        .maybeSingle(),
      sessionClient
        .from("project_task_assignees")
        .select("id, task_id, user_id")
        .eq("task_id", body.taskId)
        .eq("user_id", body.assigneeId)
        .maybeSingle(),
    ]);

  if (taskError || assignmentError || !task || !(assignment as AssignmentRow | null)) {
    return NextResponse.json({ error: "Task assignment was not found" }, { status: 404 });
  }

  // Preferences and recipient details are private to the recipient, so this
  // trusted route reads only the fields it needs with the service role.
  let admin;
  try {
    admin = createAdminClient();
  } catch (error) {
    console.error("[projects] email notification service role:", error);
    return NextResponse.json({ queued: false });
  }

  const [{ data: preference }, { data: recipient }, { data: actorDetails }] = await Promise.all([
    admin
      .from("project_notification_preferences")
      .select("task_assigned_email")
      .eq("user_id", body.assigneeId)
      .maybeSingle(),
    admin
      .from("users")
      .select("email, first_name")
      .eq("id", body.assigneeId)
      .maybeSingle(),
    admin
      .from("users")
      .select("first_name, last_name, email")
      .eq("id", actor.id)
      .maybeSingle(),
  ]);

  if (preference?.task_assigned_email === false || !recipient?.email) {
    return NextResponse.json({ queued: false });
  }

  const project = Array.isArray(task.projects) ? task.projects[0] : task.projects;
  const actorName = `${actorDetails?.first_name ?? ""} ${actorDetails?.last_name ?? ""}`.trim()
    || actorDetails?.email
    || "Someone";
  const headerStore = await headers();
  const origin = process.env.NEXT_PUBLIC_PROJECTS_URL?.replace(/\/$/, "")
    || `${headerStore.get("x-forwarded-proto") || "http"}://${headerStore.get("host")}`;

  const result = await sendTaskAssignmentEmail({
    to: recipient.email,
    recipientFirstName: recipient.first_name,
    actorName,
    taskTitle: task.title,
    projectName: project?.name ?? null,
    taskUrl: `${origin}/tasks?project=${task.project_id}`,
  });

  return NextResponse.json({ queued: result.ok });
}
