"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertCircle, ArrowLeft, CheckCircle2, Unplug } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SlackLogo } from "@/components/ui/slack-logo";
import { setCachedSlackConnection } from "@/lib/slack-connection";

type SlackData = { connected: boolean; connection?: { id: string; teamName: string | null; createdAt: string } };

function errorMessage(error: string | null) {
  switch (error) {
    case "invalid_oauth_state": return "The Slack connection session expired. Please try again.";
    case "slack_authorization_cancelled": return "Slack authorization was cancelled.";
    case "slack_not_configured": return "Slack is not configured on this deployment yet.";
    default: return error ? "Slack did not finish connecting. Please try again." : null;
  }
}

export function SlackConnectionPage() {
  const [data, setData] = React.useState<SlackData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [disconnecting, setDisconnecting] = React.useState(false);
  const params = useSearchParams();
  const error = errorMessage(params.get("error"));

  const load = React.useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await fetch("/api/integrations/slack", { cache: "no-store" });
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string; detail?: string } | null;
        throw new Error(payload?.detail || payload?.error || `Slack settings could not load (${response.status})`);
      }
      const nextData = await response.json() as SlackData;
      setData(nextData);
      setCachedSlackConnection(nextData.connected && nextData.connection ? nextData.connection : null);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Slack settings could not load");
    } finally { setLoading(false); }
  }, []);

  React.useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function disconnect() {
    setDisconnecting(true);
    try { await fetch("/api/integrations/slack", { method: "DELETE" }); setCachedSlackConnection(null); await load(); } finally { setDisconnecting(false); }
  }

  return <main className="min-h-full w-full bg-kenoo-white px-6 py-8 md:px-10 md:py-12">
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-10">
      <div><Link href="/settings" className="mb-6 inline-flex items-center gap-2 text-sm font-light text-neutral-500 hover:text-neutral-800"><ArrowLeft className="h-4 w-4" />Back to settings</Link><header className="flex items-center gap-3"><SlackLogo className="h-9 w-9 shrink-0" /><div><p className="text-xs font-medium uppercase tracking-widest text-neutral-500">Connection</p><h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">Slack</h1></div></header></div>
      {error ? <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div> : null}
      {loadError ? <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{loadError}</div> : null}
      {params.get("connected") === "slack" ? <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />Slack connected successfully.</div> : null}
      <section className="overflow-hidden rounded-[28px] bg-white/80 px-4 py-5 shadow-[0_8px_28px_rgba(15,23,42,0.07)] backdrop-blur-xl md:px-6 md:py-6">
        {loading ? <p className="text-sm font-light text-neutral-500">Loading connection…</p> : data?.connected ? <><p className="font-medium text-foreground">Connected to {data.connection?.teamName ?? "Slack"}</p><p className="mt-2 text-sm font-light leading-6 text-neutral-500">Slack is connected to this Kenoo workspace. Manage the channels and events separately under Notifications.</p><Link href="/settings/notifications/slack" className="mt-5 inline-flex h-9 items-center justify-center rounded-full border border-neutral-300/80 bg-white/70 px-5 text-sm font-medium text-neutral-700 hover:bg-white/90">Manage Slack notifications</Link><div><Button type="button" onClick={() => void disconnect()} disabled={disconnecting} className="mt-3 rounded-full border border-rose-300/70 bg-rose-50 px-5 text-rose-700 hover:bg-rose-100"><Unplug className="mr-2 h-4 w-4" />{disconnecting ? "Disconnecting…" : "Disconnect Slack"}</Button></div></> : <><p className="font-medium text-foreground">Connect Slack</p><p className="mt-2 text-sm font-light leading-6 text-neutral-500">Connect a Slack workspace to Kenoo. You can choose notification channels afterward under Notifications.</p><a href="/api/oauth/slack/login" className="mt-5 inline-flex h-9 items-center justify-center rounded-full border border-neutral-300/80 bg-white/70 px-5 text-sm font-medium text-neutral-700 hover:bg-white/90">Continue with Slack</a></>}
      </section>
    </div>
  </main>;
}
