import { NextResponse } from "next/server";
import { headers } from "next/headers";

import { createClient } from "@walls/supabase/server";
import { notifyTaskAssigneesWhenBlockerCompletes } from "@/lib/task-blocker-notification";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { taskId?: unknown };
  if (typeof body.taskId !== "string") return NextResponse.json({ error: "taskId is required" }, { status: 400 });

  const sessionClient = await createClient();
  const { data: { user } } = await sessionClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: task } = await sessionClient.from("project_tasks").select("id").eq("id", body.taskId).maybeSingle();
  if (!task) return NextResponse.json({ error: "Task was not found" }, { status: 404 });

  const headerStore = await headers();
  const origin = process.env.NEXT_PUBLIC_PROJECTS_URL?.replace(/\/$/, "")
    || `${headerStore.get("x-forwarded-proto") || "http"}://${headerStore.get("host")}`;
  // The person who completes a blocker already knows it was cleared; only
  // notify other assignees of dependent work.
  const result = await notifyTaskAssigneesWhenBlockerCompletes({
    taskId: body.taskId,
    origin,
    skipUserId: user.id,
  });
  return NextResponse.json(result);
}
