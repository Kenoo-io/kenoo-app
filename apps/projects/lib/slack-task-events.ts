"use client";

export type SlackTaskEventKey = "task_created" | "task_assigned" | "task_status_changed";
export type SlackTaskSpecificEventKey = "task_completed" | "task_blocked" | "task_unblocked";

export function getSlackSpecificStatusEvent(previousStatus: string, nextStatus: string): SlackTaskSpecificEventKey | undefined {
  if (previousStatus === nextStatus) return undefined;
  if (nextStatus === "completed") return "task_completed";
  if (nextStatus === "blocked") return "task_blocked";
  if (previousStatus === "blocked") return "task_unblocked";
  return undefined;
}

export async function notifySlackTaskEvent(taskId: string, eventKey: SlackTaskEventKey, assigneeIds?: string[], specificEventKey?: SlackTaskSpecificEventKey) {
  try {
    await fetch("/api/integrations/slack/task-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId, eventKey, assigneeIds, specificEventKey }),
    });
  } catch {
    // Slack delivery is best-effort and should never block task saves.
  }
}
