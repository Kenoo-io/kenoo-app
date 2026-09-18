import { NextResponse } from "next/server";

import {
  awsMonitoringIsConfigured,
  getAwsMonitoring,
} from "@/lib/aws-monitoring";
import { requireAdminCaller } from "@/lib/require-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SystemJob = {
  type: string;
  status: "pending" | "processing" | "completed" | "failed";
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function isoBefore(ms: number) {
  return new Date(Date.now() - ms).toISOString();
}

function durationMs(job: SystemJob) {
  if (!job.started_at || !job.completed_at) return null;
  const started = new Date(job.started_at).getTime();
  const completed = new Date(job.completed_at).getTime();
  return Number.isFinite(started) && Number.isFinite(completed) && completed >= started
    ? completed - started
    : null;
}

export async function GET() {
  const auth = await requireAdminCaller();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const now = new Date();
  const since24Hours = isoBefore(DAY_MS);
  const since7Days = isoBefore(7 * DAY_MS);

  const [pending, processing, recent, received, recentCompleted, recentFailed] = await Promise.all([
    auth.admin
      .from("systems_jobs")
      .select("created_at", { count: "exact" })
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(1),
    auth.admin
      .from("systems_jobs")
      .select("id", { count: "exact", head: true })
      .eq("status", "processing"),
    auth.admin
      .from("systems_jobs")
      .select("type, status, created_at, started_at, completed_at")
      .gte("created_at", since7Days)
      .order("created_at", { ascending: false })
      .limit(1000),
    auth.admin
      .from("systems_jobs")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since24Hours),
    auth.admin
      .from("systems_jobs")
      .select("id", { count: "exact", head: true })
      .eq("status", "completed")
      .gte("completed_at", since24Hours),
    auth.admin
      .from("systems_jobs")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed")
      .gte("updated_at", since24Hours),
  ]);

  const errors = [pending.error, processing.error, recent.error, received.error, recentCompleted.error, recentFailed.error]
    .filter(Boolean);
  if (errors.length) {
    console.error("[monitoring] Failed to collect systems job telemetry", errors);
    return NextResponse.json(
      { error: "Unable to load internal job telemetry" },
      { status: 500 },
    );
  }

  const jobs = (recent.data ?? []) as SystemJob[];
  const jobs24Hours = jobs.filter((job) => job.created_at >= since24Hours);
  const completedDurations = jobs
    .filter((job) => job.status === "completed")
    .map(durationMs)
    .filter((value): value is number => value !== null);
  const completedByType = new Map<string, number>();
  const failuresByType = new Map<string, number>();

  for (const job of jobs24Hours) {
    if (job.status === "completed") {
      completedByType.set(job.type, (completedByType.get(job.type) ?? 0) + 1);
    }
    if (job.status === "failed") {
      failuresByType.set(job.type, (failuresByType.get(job.type) ?? 0) + 1);
    }
  }

  const oldestPendingAt = pending.data?.[0]?.created_at ?? null;
  const pendingAgeMs = oldestPendingAt
    ? Math.max(0, now.getTime() - new Date(oldestPendingAt).getTime())
    : null;
  const failed24Hours = recentFailed.count ?? 0;
  const status = failed24Hours > 0 || (pendingAgeMs !== null && pendingAgeMs > 15 * 60 * 1000)
    ? "attention"
    : "healthy";

  const aws = awsMonitoringIsConfigured()
    ? await getAwsMonitoring()
        .then((data) => ({
          id: "aws" as const,
          name: "Amazon Web Services",
          status: "connected" as const,
          detail: "Live read-only cost and infrastructure data.",
          data,
        }))
        .catch((error) => {
          console.error("[monitoring] Failed to load AWS telemetry", error);
          return {
            id: "aws" as const,
            name: "Amazon Web Services",
            status: "error" as const,
            detail: "The connection is configured, but AWS did not return monitoring data. Check the role policy and connection settings.",
          };
        })
    : {
        id: "aws" as const,
        name: "Amazon Web Services",
        status: "not_connected" as const,
        detail: "Cost, ECS, SQS, and CloudWatch feeds are awaiting a read-only monitoring role.",
      };

  return NextResponse.json({
    generatedAt: now.toISOString(),
    overallStatus: status,
    internal: {
      pending: pending.count ?? 0,
      processing: processing.count ?? 0,
      completed24Hours: recentCompleted.count ?? 0,
      failed24Hours,
      received24Hours: received.count ?? 0,
      oldestPendingAt,
      averageDurationMs: completedDurations.length
        ? Math.round(completedDurations.reduce((sum, value) => sum + value, 0) / completedDurations.length)
        : null,
      completedByType: Object.fromEntries(completedByType),
      failuresByType: Object.fromEntries(failuresByType),
    },
    providers: [
      aws,
      {
        id: "hetzner",
        name: "Hetzner Cloud",
        status: "not_connected",
        detail: "Ready to connect when the first Hetzner backend is introduced.",
      },
    ],
  });
}
