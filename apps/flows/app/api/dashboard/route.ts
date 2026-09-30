import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { ACTIVE_ACCOUNT_COOKIE } from "@walls/auth/active-account";
import { createClient } from "@walls/supabase/server";

const FLOWS_ACCOUNT_COOKIE = "flows_account_id";
const RANGE_DAYS = 30;

async function getAccountContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, accountId: null };

  const cookieStore = await cookies();
  const requestedAccountId = cookieStore.get(ACTIVE_ACCOUNT_COOKIE)?.value ?? cookieStore.get(FLOWS_ACCOUNT_COOKIE)?.value ?? null;
  if (!requestedAccountId) return { supabase, accountId: null };

  const { data: membership } = await supabase
    .from("account_users")
    .select("account_id")
    .eq("user_id", user.id)
    .eq("account_id", requestedAccountId)
    .maybeSingle();

  return { supabase, accountId: membership?.account_id ?? null };
}

type JsonObject = Record<string, unknown>;

type Workflow = {
  id: string;
  name: string;
  status: "draft" | "active" | "paused" | "archived";
  active_version_id: string | null;
};

type Run = {
  id: string;
  workflow_id: string;
  audience_id: string | null;
  trigger_occurrence_id: string | null;
  status: string;
  created_at: string;
};

function dayKey(value: string | Date) {
  return new Date(value).toISOString().slice(0, 10);
}

function numberFromObject(value: unknown, keys: string[]) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  for (const key of keys) {
    const candidate = (value as JsonObject)[key];
    const amount = typeof candidate === "number" ? candidate : typeof candidate === "string" ? Number(candidate) : NaN;
    if (Number.isFinite(amount)) return amount;
  }
  return null;
}

function formatMoney(value: number | null) {
  if (value == null) return null;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);
}

export async function GET() {
  const { supabase, accountId } = await getAccountContext();
  if (!accountId) return NextResponse.json({ error: "No active account" }, { status: 401 });

  const rangeEnd = new Date();
  const rangeStart = new Date(rangeEnd);
  rangeStart.setDate(rangeStart.getDate() - (RANGE_DAYS - 1));
  rangeStart.setHours(0, 0, 0, 0);

  const [workflowsResult, versionsResult, eventsResult, occurrencesResult, audienceResult, runsResult, stepsResult] = await Promise.all([
    supabase.from("flow_workflows").select("id, name, status, active_version_id").eq("account_id", accountId).order("updated_at", { ascending: false }),
    supabase.from("flow_workflow_versions").select("id, workflow_id, version_number, trigger_event_id").eq("account_id", accountId).order("version_number", { ascending: false }),
    supabase.from("flow_events").select("id, key, name").eq("account_id", accountId),
    supabase.from("flow_event_occurrences").select("id, event_key, occurred_at, external_id, audience_id, payload, context").eq("account_id", accountId).gte("occurred_at", rangeStart.toISOString()).lte("occurred_at", rangeEnd.toISOString()).order("occurred_at", { ascending: true }).limit(10000),
    supabase.from("flow_audience").select("id", { count: "exact", head: true }).eq("account_id", accountId),
    supabase.from("flow_workflow_runs").select("id, workflow_id, audience_id, trigger_occurrence_id, status, created_at").eq("account_id", accountId).gte("created_at", rangeStart.toISOString()).lte("created_at", rangeEnd.toISOString()).limit(10000),
    supabase.from("flow_workflow_step_runs").select("run_id, node_type, status, completed_at").eq("account_id", accountId).gte("created_at", rangeStart.toISOString()).lte("created_at", rangeEnd.toISOString()).limit(20000),
  ]);

  const failed = [workflowsResult, versionsResult, eventsResult, occurrencesResult, audienceResult, runsResult, stepsResult].find((result) => result.error);
  if (failed?.error) {
    console.error("[flows] dashboard load failed", { accountId, error: failed.error });
    return NextResponse.json({ error: "Unable to load dashboard" }, { status: 500 });
  }

  const workflows = (workflowsResult.data ?? []) as Workflow[];
  const versions = versionsResult.data ?? [];
  const eventNames = new Map((eventsResult.data ?? []).map((event) => [event.id as string, event.name as string]));
  const eventKeys = new Map((eventsResult.data ?? []).map((event) => [event.id as string, event.key as string]));
  const latestVersionByWorkflow = new Map<string, { trigger_event_id: string | null }>();
  for (const version of versions) {
    if (!latestVersionByWorkflow.has(version.workflow_id as string)) latestVersionByWorkflow.set(version.workflow_id as string, version as { trigger_event_id: string | null });
  }

  const occurrences = (occurrencesResult.data ?? []) as Array<{ id: string; event_key: string; occurred_at: string; external_id: string | null; audience_id: string | null; payload: JsonObject; context: JsonObject }>;
  const runs = (runsResult.data ?? []) as Run[];
  const steps = stepsResult.data ?? [];
  const occurrenceById = new Map(occurrences.map((occurrence) => [occurrence.id, occurrence]));
  const dailyCounts = new Map<string, number>();
  for (let index = 0; index < RANGE_DAYS; index += 1) {
    const date = new Date(rangeStart);
    date.setDate(rangeStart.getDate() + index);
    dailyCounts.set(dayKey(date), 0);
  }
  for (const occurrence of occurrences) dailyCounts.set(dayKey(occurrence.occurred_at), (dailyCounts.get(dayKey(occurrence.occurred_at)) ?? 0) + 1);

  const completedEmailSteps = steps.filter((step) => step.status === "completed" && ["send_email", "email"].includes(String(step.node_type))).length;
  const totalRuns = runs.length;
  const completedRuns = runs.filter((run) => run.status === "completed").length;
  const revenueKeys = ["revenue", "amount", "total", "order_total", "value"];
  const revenue = occurrences.reduce((sum, occurrence) => sum + (numberFromObject(occurrence.payload, revenueKeys) ?? numberFromObject(occurrence.context, revenueKeys) ?? 0), 0);
  const hasRevenue = occurrences.some((occurrence) => numberFromObject(occurrence.payload, revenueKeys) != null || numberFromObject(occurrence.context, revenueKeys) != null);

  const flowRows = workflows.map((workflow) => {
    const workflowRuns = runs.filter((run) => run.workflow_id === workflow.id);
    const profiles = new Set(workflowRuns.map((run) => run.audience_id).filter(Boolean)).size;
    const flowRevenue = workflowRuns.reduce((sum, run) => {
      const occurrence = run.trigger_occurrence_id ? occurrenceById.get(run.trigger_occurrence_id) : null;
      return sum + (occurrence ? (numberFromObject(occurrence.payload, revenueKeys) ?? numberFromObject(occurrence.context, revenueKeys) ?? 0) : 0);
    }, 0);
    const version = workflow.active_version_id ? versions.find((item) => item.id === workflow.active_version_id) : latestVersionByWorkflow.get(workflow.id);
    const triggerEventId = version?.trigger_event_id ?? null;
    return {
      id: workflow.id,
      name: workflow.name,
      trigger: triggerEventId ? eventNames.get(triggerEventId) ?? eventKeys.get(triggerEventId) ?? "Event trigger" : "Event trigger",
      status: workflow.status,
      profiles,
      conversion: workflowRuns.length ? Math.round((workflowRuns.filter((run) => run.status === "completed").length / workflowRuns.length) * 1000) / 10 : null,
      revenue: flowRevenue > 0 ? formatMoney(flowRevenue) : null,
    };
  });

  return NextResponse.json({
    range: { start: rangeStart.toISOString(), end: rangeEnd.toISOString(), days: RANGE_DAYS },
    metrics: {
      revenue: hasRevenue ? formatMoney(revenue) : null,
      activeProfiles: audienceResult.count ?? 0,
      emailsDelivered: completedEmailSteps,
      conversion: totalRuns ? Math.round((completedRuns / totalRuns) * 1000) / 10 : null,
      totalOccurrences: occurrences.length,
      totalRuns,
    },
    daily: [...dailyCounts].map(([date, count]) => ({ date, count })),
    flows: flowRows,
  });
}
