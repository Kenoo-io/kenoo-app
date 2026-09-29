"use client";

import { AlertCircle, ArrowLeft, Check, Link2Off } from "lucide-react";
import Link from "next/link";
import * as React from "react";

type SlackOption = { id: string; name: string; email: string | null };
type MappingUser = { id: string; name: string; email: string | null; slackUserId: string | null; suggestedSlackUserId: string | null };
type MappingResponse = { connected: boolean; connection?: { teamName: string | null }; slackUsers: SlackOption[]; users: MappingUser[]; error?: string; code?: string };

export function SlackUserMappingsPage() {
  const [data, setData] = React.useState<MappingResponse | null>(null);
  const [values, setValues] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setError(null);
    const response = await fetch("/api/integrations/slack/users", { cache: "no-store" });
    const result = await response.json() as MappingResponse;
    if (!response.ok) {
      if (result.code) setData(result);
      throw new Error(result.error || "Unable to load Slack user mappings");
    }
    setData(result);
    setValues(Object.fromEntries(result.users.map((person) => [person.id, person.slackUserId ?? person.suggestedSlackUserId ?? ""])));
  }, []);

  React.useEffect(() => { void load().catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Unable to load Slack user mappings")); }, [load]);

  async function save(userId: string) {
    setSaving(userId);
    setError(null);
    try {
      const response = await fetch("/api/integrations/slack/users", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kenooUserId: userId, slackUserId: values[userId] || null }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Unable to save mapping");
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save mapping");
    } finally {
      setSaving(null);
    }
  }

  return <main className="min-h-full w-full bg-kenoo-white px-6 py-8 md:px-10 md:py-12"><div className="mx-auto flex w-full max-w-4xl flex-col gap-8"><div><Link href="/settings" className="mb-6 inline-flex items-center gap-2 text-sm font-light text-neutral-500 hover:text-neutral-800"><ArrowLeft className="h-4 w-4" />Back to settings</Link><p className="text-xs font-medium uppercase tracking-widest text-neutral-500">Slack settings</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">Slack user mappings</h1><p className="mt-2 max-w-2xl text-sm font-light leading-6 text-neutral-500">Connect Projects users to their Slack identities so task notifications can use real Slack mentions.</p></div>{error ? <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div> : null}{data && !data.connected ? <section className="rounded-[28px] bg-white/80 px-6 py-8 shadow-[0_8px_28px_rgba(15,23,42,0.07)]"><p className="font-medium text-foreground">Slack is not connected</p><p className="mt-2 text-sm font-light text-neutral-500">Connect a Slack workspace before mapping users.</p><Link href="/settings/connections/slack" className="mt-5 inline-flex h-9 items-center rounded-full border border-neutral-300/80 bg-white px-5 text-sm font-medium text-neutral-700 hover:bg-neutral-50">Connect Slack</Link></section> : data?.code === "slack_reconnect_required" ? <section className="rounded-[28px] bg-white/80 px-6 py-8 shadow-[0_8px_28px_rgba(15,23,42,0.07)]"><p className="font-medium text-foreground">Reconnect Slack to enable mappings</p><p className="mt-2 text-sm font-light text-neutral-500">The Slack app now needs permission to read workspace members for true mentions.</p><Link href="/settings/connections/slack" className="mt-5 inline-flex h-9 items-center rounded-full bg-neutral-950 px-5 text-sm font-medium text-white hover:bg-neutral-800">Reconnect Slack</Link></section> : data ? <section className="overflow-hidden rounded-[28px] bg-white/80 shadow-[0_8px_28px_rgba(15,23,42,0.07)]"><div className="border-b border-neutral-100 px-6 py-5"><p className="font-medium text-foreground">{data.connection?.teamName ?? "Slack workspace"}</p><p className="mt-1 text-sm font-light text-neutral-500">Suggestions are based on matching email addresses. Save a row to activate its mapping.</p></div><div className="divide-y divide-neutral-100">{data.users.length === 0 ? <div className="px-6 py-10 text-center text-sm font-light text-neutral-500">No Projects users found.</div> : data.users.map((person) => <div key={person.id} className="flex flex-col gap-3 px-6 py-4 md:flex-row md:items-center md:justify-between"><div className="min-w-0"><p className="font-medium text-foreground">{person.name}</p><p className="truncate text-sm font-light text-neutral-500">{person.email ?? "No email address"}</p></div><div className="flex w-full items-center gap-2 md:w-[22rem]"><select value={values[person.id] ?? ""} onChange={(event) => setValues((current) => ({ ...current, [person.id]: event.target.value }))} className="h-10 min-w-0 flex-1 rounded-xl border border-neutral-200 bg-white px-3 text-sm text-neutral-700 outline-none focus:border-[var(--kenoo-sky)]"><option value="">No Slack mapping</option>{data.slackUsers.map((slackUser) => <option key={slackUser.id} value={slackUser.id}>{slackUser.name}{slackUser.email ? ` · ${slackUser.email}` : ""}</option>)}</select><button type="button" onClick={() => void save(person.id)} disabled={saving === person.id} className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-neutral-950 px-3 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50">{values[person.id] ? <Check className="h-4 w-4" /> : <Link2Off className="h-4 w-4" />}{saving === person.id ? "Saving…" : "Save"}</button></div></div>)}</div></section> : <p className="text-sm font-light text-neutral-500">Loading Slack users…</p>}</div></main>;
}
