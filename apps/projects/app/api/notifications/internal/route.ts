import { NextResponse } from "next/server";

import { createAdminClient } from "@walls/supabase/admin";
import { createClient } from "@walls/supabase/server";
import {
  notifyProjectMembersAdded,
  notifyTaskAssignee,
  notifyTaskAssignerOnComplete,
} from "@/lib/user-notifications";

type RequestBody = {
  event?: unknown;
  projectId?: unknown;
  userIds?: unknown;
  taskId?: unknown;
};

type TaskRow = {
  id: string;
  title: string;
  status: string;
  project_id: string;
  assigned_by: string | null;
  projects: { name: string | null; account_id: string } | { name: string | null; account_id: string }[] | null;
};

function projectFromTask(task: TaskRow) {
  return Array.isArray(task.projects) ? task.projects[0] : task.projects;
}

async function getActorName(admin: ReturnType<typeof createAdminClient>, userId: string) {
  const { data } = await admin.from("users").select("first_name, last_name, email").eq("id", userId).maybeSingle();
  if (!data) return "Someone";
  return [data.first_name, data.last_name].filter(Boolean).join(" ") || data.email || "Someone";
}

async function canManageProjectNotifications(admin: ReturnType<typeof createAdminClient>, projectId: string, userId: string) {
  const { data } = await admin
    .from("project_members")
    .select("user_id")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .maybeSingle();
  return Boolean(data);
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as RequestBody;
  const sessionClient = await createClient();
  const { data: { user } } = await sessionClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const event = body.event;
  if (event !== "project_member_added" && event !== "task_assigned" && event !== "task_completed") {
    return NextResponse.json({ error: "Unsupported notification event" }, { status: 400 });
  }

  const admin = createAdminClient();
  const actorName = await getActorName(admin, user.id);

  if (event === "project_member_added") {
    if (typeof body.projectId !== "string" || !Array.isArray(body.userIds)) {
      return NextResponse.json({ error: "projectId and userIds are required" }, { status: 400 });
    }
    const userIds = body.userIds.filter((id): id is string => typeof id === "string");
    const { data: project } = await admin.from("projects").select("id, name").eq("id", body.projectId).maybeSingle();
    if (!project) return NextResponse.json({ error: "Project was not found" }, { status: 404 });
    if (!(await canManageProjectNotifications(admin, project.id, user.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await notifyProjectMembersAdded(admin, {
      userIds,
      projectId: project.id,
      projectName: project.name,
      actorUserId: user.id,
      actorName,
    });
  } else {
    if (typeof body.taskId !== "string") return NextResponse.json({ error: "taskId is required" }, { status: 400 });
    const { data: task } = await admin
      .from("project_tasks")
      .select("id, title, status, project_id, assigned_by, projects(name, account_id)")
      .eq("id", body.taskId)
      .maybeSingle();
    const taskRow = task as TaskRow | null;
    const project = taskRow ? projectFromTask(taskRow) : null;
    if (!taskRow || !project) return NextResponse.json({ error: "Task was not found" }, { status: 404 });
    if (!(await canManageProjectNotifications(admin, taskRow.project_id, user.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (event === "task_assigned") {
      const userIds = Array.isArray(body.userIds)
        ? body.userIds.filter((id): id is string => typeof id === "string")
        : [];
      for (const assigneeId of userIds) {
        await notifyTaskAssignee(admin, {
          assigneeId,
          taskId: taskRow.id,
          taskTitle: taskRow.title,
          projectId: taskRow.project_id,
          projectName: project.name,
          actorUserId: user.id,
          actorName,
        });
      }
    } else {
      if (taskRow.status !== "completed" || !taskRow.assigned_by || taskRow.assigned_by === user.id) {
        return NextResponse.json({ ok: true });
      }
      const { data: assignment } = await admin
        .from("project_task_assignees")
        .select("user_id")
        .eq("task_id", taskRow.id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!assignment) return NextResponse.json({ ok: true });
      await notifyTaskAssignerOnComplete(admin, {
        assignerId: taskRow.assigned_by,
        taskId: taskRow.id,
        taskTitle: taskRow.title,
        projectId: taskRow.project_id,
        projectName: project.name,
        completerUserId: user.id,
        completerName: actorName,
      });
    }
  }

  return NextResponse.json({ ok: true });
}
