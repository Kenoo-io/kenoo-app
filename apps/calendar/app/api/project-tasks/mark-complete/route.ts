import { createAdminClient } from "@walls/supabase/admin";
import { createClient } from "@walls/supabase/server";
import { NextRequest, NextResponse } from "next/server";

import {
  notifyAssignersForCompletedTasks,
  resolveActorDisplayName,
} from "@/lib/user-notifications";

/** POST: Mark project tasks as complete. Body: { taskIds: string[] }. */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const taskIds = Array.isArray(body.taskIds) ? body.taskIds : [];
    if (taskIds.length === 0) {
      return NextResponse.json({ error: "taskIds required" }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();
    const assigneeId = user.id;

    const { data: assignedRows } = await supabaseAdmin
      .from("project_task_assignees")
      .select("task_id")
      .eq("user_id", assigneeId)
      .in("task_id", taskIds);

    const assignedTaskIds = (assignedRows ?? []).map((row) => row.task_id as string);
    if (assignedTaskIds.length === 0) {
      return NextResponse.json({ success: true });
    }

    const { data: tasksToComplete } = await supabaseAdmin
      .from("project_tasks")
      .select(
        "id, title, project_id, assigned_by, status, projects(name)",
      )
      .in("id", assignedTaskIds)
      .neq("status", "completed");

    const { error } = await supabaseAdmin
      .from("project_tasks")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .in("id", assignedTaskIds);

    if (error) {
      return NextResponse.json(
        { error: error.message || "Failed to update tasks" },
        { status: 500 },
      );
    }

    if (tasksToComplete && tasksToComplete.length > 0) {
      const completerName = await resolveActorDisplayName(
        supabaseAdmin,
        assigneeId,
      );
      await notifyAssignersForCompletedTasks(
        supabaseAdmin,
        tasksToComplete,
        assigneeId,
        completerName,
      );
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Error in mark-complete:", e);
    return NextResponse.json(
      { error: "Failed to update tasks" },
      { status: 500 },
    );
  }
}
