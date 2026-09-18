"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Cloud,
  RefreshCw,
  ServerCog,
  Timer,
} from "lucide-react";

import { Button } from "@/components/ui/button";

type MonitoringData = {
  generatedAt: string;
  overallStatus: "healthy" | "attention";
  internal: {
    pending: number;
    processing: number;
    completed24Hours: number;
    failed24Hours: number;
    received24Hours: number;
    oldestPendingAt: string | null;
    averageDurationMs: number | null;
    completedByType: Record<string, number>;
    failuresByType: Record<string, number>;
  };
  providers: Array<{
    id: string;
    name: string;
    status: "not_connected";
    detail: string;
  }>;
};

function count(value: number | undefined) {
  return value == null ? "—" : value.toLocaleString();
}

function elapsed(iso: string | null) {
  if (!iso) return "No pending work";
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60_000));
  if (minutes < 1) return "Less than 1 min";
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function duration(milliseconds: number | null) {
  if (milliseconds == null) return "—";
  if (milliseconds < 1_000) return `${milliseconds} ms`;
  if (milliseconds < 60_000) return `${(milliseconds / 1_000).toFixed(1)} sec`;
  return `${Math.round(milliseconds / 60_000)} min`;
}

function refreshedAt(iso: string | undefined) {
  if (!iso) return "Loading…";
  return `Updated ${new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
}

export function MonitoringDashboard() {
  const [data, setData] = useState<MonitoringData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/monitoring", { cache: "no-store" });
      const body = (await response.json()) as MonitoringData & { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Unable to load monitoring data");
      setData(body);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load monitoring data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void load(), 0);
    const interval = window.setInterval(() => void load(), 60_000);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(interval);
    };
  }, [load]);

  const needsAttention = data?.overallStatus === "attention";
  const jobTypes = new Set([
    ...Object.keys(data?.internal.completedByType ?? {}),
    ...Object.keys(data?.internal.failuresByType ?? {}),
  ]);

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 rounded-xl border border-neutral-200 bg-kenoo-white p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 rounded-full p-2 ${needsAttention ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
            {needsAttention ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
          </div>
          <div>
            <p className="text-sm font-semibold text-neutral-950">
              {needsAttention ? "Internal systems need attention" : "Internal systems are operating normally"}
            </p>
            <p className="mt-1 text-sm text-neutral-500">
              Live job telemetry refreshes automatically every minute. {refreshedAt(data?.generatedAt)}
            </p>
          </div>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </section>

      {error ? (
        <section className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">
          {error}
        </section>
      ) : null}

      <section className="grid overflow-hidden rounded-xl border border-neutral-200 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Pending" value={count(data?.internal.pending)} icon={Clock3} detail={`Oldest: ${elapsed(data?.internal.oldestPendingAt ?? null)}`} />
        <Metric label="Processing" value={count(data?.internal.processing)} icon={Activity} detail="Workers actively handling jobs" />
        <Metric label="Completed (24h)" value={count(data?.internal.completed24Hours)} icon={CheckCircle2} detail={`${count(data?.internal.received24Hours)} received in the last 24h`} />
        <Metric label="Failed (24h)" value={count(data?.internal.failed24Hours)} icon={AlertTriangle} detail="Requires investigation when non-zero" alert={(data?.internal.failed24Hours ?? 0) > 0} />
      </section>

      <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-xl border border-neutral-200 bg-kenoo-white p-5">
          <div className="flex items-center gap-2">
            <ServerCog className="h-4 w-4 text-neutral-500" />
            <h2 className="text-sm font-semibold text-neutral-950">Systems workload</h2>
          </div>
          <p className="mt-1 text-sm text-neutral-500">Internal job activity from the last 24 hours, broken down by worker type.</p>
          {jobTypes.size ? (
            <div className="mt-5 divide-y divide-neutral-100">
              {[...jobTypes].sort().map((type) => {
                const completed = data?.internal.completedByType[type] ?? 0;
                const failed = data?.internal.failuresByType[type] ?? 0;
                return (
                  <div key={type} className="flex items-center justify-between gap-4 py-3 text-sm">
                    <span className="font-medium text-neutral-900">{type}</span>
                    <span className="text-neutral-500">
                      <span className="text-emerald-700">{completed} completed</span>
                      <span className="mx-2 text-neutral-300">•</span>
                      <span className={failed ? "text-rose-700" : "text-neutral-500"}>{failed} failed</span>
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mt-5 rounded-lg bg-neutral-50 p-4 text-sm text-neutral-500">No systems jobs have been recorded in the last seven days.</p>
          )}
        </section>

        <section className="rounded-xl border border-neutral-200 bg-kenoo-white p-5">
          <div className="flex items-center gap-2">
            <Timer className="h-4 w-4 text-neutral-500" />
            <h2 className="text-sm font-semibold text-neutral-950">Worker timing</h2>
          </div>
          <dl className="mt-5 space-y-4">
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-sm text-neutral-500">Average completed job</dt>
              <dd className="text-sm font-semibold text-neutral-950">{duration(data?.internal.averageDurationMs ?? null)}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-sm text-neutral-500">Backlog age</dt>
              <dd className="text-sm font-semibold text-neutral-950">{elapsed(data?.internal.oldestPendingAt ?? null)}</dd>
            </div>
          </dl>
          <p className="mt-5 rounded-lg bg-neutral-50 p-4 text-xs leading-5 text-neutral-500">
            A backlog older than 15 minutes or any failed job in the last 24 hours marks this screen for attention.
          </p>
        </section>
      </div>

      <section className="rounded-xl border border-neutral-200 bg-kenoo-white p-5">
        <div className="flex items-center gap-2">
          <Cloud className="h-4 w-4 text-neutral-500" />
          <h2 className="text-sm font-semibold text-neutral-950">Provider connections</h2>
        </div>
        <p className="mt-1 text-sm text-neutral-500">External feeds appear here only after a server-side, read-only connection is configured.</p>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {data?.providers.map((provider) => (
            <div key={provider.id} className="rounded-lg border border-dashed border-neutral-300 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-neutral-900">{provider.name}</p>
                <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-600">Awaiting connection</span>
              </div>
              <p className="mt-2 text-sm leading-5 text-neutral-500">{provider.detail}</p>
            </div>
          )) ?? <div className="h-24 animate-pulse rounded-lg bg-neutral-100" />}
        </div>
      </section>
    </div>
  );
}

function Metric({
  label,
  value,
  detail,
  icon: Icon,
  alert = false,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof Activity;
  alert?: boolean;
}) {
  return (
    <div className="border-b border-neutral-200 p-5 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
      <div className="flex items-center justify-between text-neutral-500">
        <p className="text-sm">{label}</p>
        <Icon className={`h-4 w-4 ${alert ? "text-rose-500" : ""}`} />
      </div>
      <p className={`mt-3 text-[28px] font-semibold tracking-tight ${alert ? "text-rose-700" : "text-neutral-950"}`}>{value}</p>
      <p className="mt-1 text-xs leading-5 text-neutral-500">{detail}</p>
    </div>
  );
}
