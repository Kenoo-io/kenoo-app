"use client";

import * as React from "react";
import Link from "next/link";
import { AlertCircle, ArrowLeft, Check, ChevronDown, Hash, Lock, Pencil, Plus, Trash2, X } from "lucide-react";

type Channel = { id: string; name: string; is_private?: boolean };
type Project = { id: string; name: string };
type Rule = { id: string; channelId: string; channelName: string; isPrivate?: boolean; eventKeys: string[]; projectIds: string[]; enabled: boolean };
type SlackData = { connected: boolean; connection?: { teamName: string | null }; channels: Channel[]; projects: Project[]; rules: Rule[] };
const EVENT_OPTIONS = [["task_created", "New task created"], ["task_assigned", "Assignees added"], ["task_status_changed", "Task status changed"], ["task_completed", "Task completed"], ["task_blocked", "Task blocked"], ["task_unblocked", "Task unblocked"], ["task_overdue", "Task overdue"]] as const;

type NotificationsCache = { data: SlackData | null; loaded: boolean; loading: boolean; loadedAt: number };
let notificationsCache: NotificationsCache = { data: null, loaded: false, loading: false, loadedAt: 0 };
let pendingNotificationsRequest: Promise<SlackData> | null = null;
const notificationsListeners = new Set<() => void>();

function publishNotificationsCache() { notificationsListeners.forEach((listener) => listener()); }
function updateNotificationsCache(update: Partial<NotificationsCache>) { notificationsCache = { ...notificationsCache, ...update }; publishNotificationsCache(); }

async function loadSlackNotifications(force = false, includeChannels = false): Promise<SlackData> {
  const hasChannels = notificationsCache.data?.channels.length;
  if (!force && notificationsCache.loaded && notificationsCache.data && Date.now() - notificationsCache.loadedAt < 30_000 && (includeChannels ? hasChannels : true)) return notificationsCache.data;
  if (pendingNotificationsRequest) return pendingNotificationsRequest;
  updateNotificationsCache({ loading: true });
  const params = new URLSearchParams();
  if (includeChannels) params.set("includeChannels", "1");
  if (force) params.set("refresh", String(Date.now()));
  pendingNotificationsRequest = fetch(`/api/integrations/slack/notifications${params.size > 0 ? `?${params.toString()}` : ""}`, { cache: "no-store" })
    .then(async (response) => {
      const payload = await response.json() as SlackData & { error?: string };
      if (!response.ok) throw new Error(payload.error || "Unable to load Slack notifications");
      updateNotificationsCache({ data: payload, loaded: true, loading: false, loadedAt: Date.now() });
      return payload;
    })
    .catch((error: unknown) => { updateNotificationsCache({ loading: false }); throw error; })
    .finally(() => { pendingNotificationsRequest = null; });
  return pendingNotificationsRequest;
}

function DropdownField({ label, placeholder, options, value, multiple = false, exclusiveValue, onChange }: { label: string; placeholder: string; options: Array<{ value: string; label: string }>; value: string[]; multiple?: boolean; exclusiveValue?: string; onChange: (value: string[]) => void }) {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const selected = options.filter((option) => value.includes(option.value));
  const display = selected.length > 2 && multiple ? `${selected.length} ${label === "Project" ? "projects" : "events"} selected` : selected.length > 0 ? selected.map((option) => option.label).join(", ") : placeholder;
  React.useEffect(() => {
    if (!open) return;
    function closeOnOutsideClick(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, [open]);
  function choose(optionValue: string) {
    if (!multiple) { onChange([optionValue]); setOpen(false); return; }
    if (exclusiveValue && optionValue === exclusiveValue) {
      onChange(value.includes(optionValue) ? [] : [optionValue]);
      return;
    }
    onChange(value.includes(optionValue) ? value.filter((item) => item !== optionValue) : [...value.filter((item) => item !== exclusiveValue), optionValue]);
  }
  function handleWheel(event: React.WheelEvent<HTMLDivElement>) {
    const element = event.currentTarget;
    const cannotScroll = element.scrollHeight <= element.clientHeight;
    const atTop = element.scrollTop <= 0 && event.deltaY < 0;
    const atBottom = element.scrollTop + element.clientHeight >= element.scrollHeight - 1 && event.deltaY > 0;
    if (cannotScroll || atTop || atBottom) event.preventDefault();
    event.stopPropagation();
  }
  const hasValue = selected.length > 0;
  return <div ref={containerRef} className="relative pt-2"><button type="button" onClick={() => setOpen((current) => !current)} className={`relative flex h-12 w-full items-center rounded-2xl border bg-kenoo-white px-4 text-left text-sm font-light outline-none transition ${open ? "border-[var(--kenoo-sky)]" : "border-[#e5e5e5]"}`}>{hasValue || open ? <span className={`absolute -top-2 left-3 bg-kenoo-white px-1.5 text-[11px] ${open ? "text-[var(--kenoo-sky)]" : "text-neutral-500"}`}>{label}</span> : null}<span className={`min-w-0 flex-1 truncate ${hasValue ? "text-foreground" : "text-neutral-400"}`}>{display}</span><ChevronDown className={`h-4 w-4 shrink-0 text-neutral-500 transition-transform ${open ? "rotate-180" : ""}`} /></button>{open ? <div onWheel={handleWheel} onTouchMove={(event) => event.stopPropagation()} className="absolute left-0 right-0 z-20 mt-2 max-h-56 overscroll-contain overflow-y-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden rounded-2xl border border-neutral-200 bg-white p-1.5 shadow-xl">{options.map((option) => <button key={option.value} type="button" onClick={() => choose(option.value)} className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-neutral-700 hover:bg-neutral-50"><span>{option.label}</span>{value.includes(option.value) ? <Check className="h-4 w-4 shrink-0 text-[var(--kenoo-sky)]" /> : null}</button>)}</div> : null}</div>;
}

export function SlackNotificationsPage() {
  const [cacheState, setCacheState] = React.useState(notificationsCache);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Rule | null>(null);
  const [channelId, setChannelId] = React.useState("");
  const [projectIds, setProjectIds] = React.useState<string[]>([]);
  const [eventKeys, setEventKeys] = React.useState<string[]>(["task_completed"]);

  const load = React.useCallback(async (force = false, includeChannels = false) => {
    try { const refreshed = await loadSlackNotifications(force, includeChannels); setCacheState({ ...notificationsCache, data: refreshed, loaded: true, loading: false }); return refreshed; } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to load Slack notifications"); return null; }
  }, []);
  React.useEffect(() => {
    const subscribe = () => setCacheState(notificationsCache);
    notificationsListeners.add(subscribe);
    setCacheState(notificationsCache);
    if (!notificationsCache.loaded) void load();
    return () => { notificationsListeners.delete(subscribe); };
  }, [load]);
  const data = cacheState.data;
  const loading = cacheState.loading || !cacheState.loaded;
  async function openCreate() {
    setEditing(null); setProjectIds([]); setEventKeys(["task_completed"]); setError(null); setModalOpen(true);
    const refreshed = await load(false, true);
    setChannelId(refreshed?.channels[0]?.id ?? "");
  }
  async function openEdit(rule: Rule) {
    setEditing(rule); setChannelId(rule.channelId); setProjectIds(rule.projectIds); setEventKeys(rule.eventKeys); setError(null); setModalOpen(true);
    await load(false, true);
  }
  async function save() {
    const channel = data?.channels.find((item) => item.id === channelId);
    if (!channel || eventKeys.length === 0) { setError("Choose a channel and at least one event."); return; }
    setPending(true); setError(null);
    try {
      const response = await fetch("/api/integrations/slack/notifications", { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editing?.id, channelId, channelName: channel.name, isPrivate: channel.is_private, eventKeys, projectIds }) });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Unable to save notification");
      setModalOpen(false); await load(true, true);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to save notification"); } finally { setPending(false); }
  }
  async function remove(rule: Rule) {
    if (!window.confirm(`Delete notifications for #${rule.channelName}?`)) return;
    setPending(true); setError(null);
    try { const response = await fetch(`/api/integrations/slack/notifications?id=${encodeURIComponent(rule.id)}`, { method: "DELETE" }); const payload = await response.json() as { error?: string }; if (!response.ok) throw new Error(payload.error || "Unable to delete notification"); await load(true); } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to delete notification"); } finally { setPending(false); }
  }
  const projectName = (id: string) => data?.projects.find((project) => project.id === id)?.name;
  const channelOptions = (data?.channels ?? []).map((channel) => ({ value: channel.id, label: `#${channel.name}` }));
  const projectOptions = [{ value: "__all__", label: "All Projects" }, ...(data?.projects ?? []).map((project) => ({ value: project.id, label: project.name }))];
  const eventOptions = EVENT_OPTIONS.map(([value, label]) => ({ value, label }));
  return <main className="min-h-full w-full bg-kenoo-white px-6 py-8 md:px-10 md:py-12"><div className="mx-auto flex w-full max-w-5xl flex-col gap-8"><div><Link href="/settings" className="mb-6 inline-flex items-center gap-2 text-sm font-light text-neutral-500 hover:text-neutral-800"><ArrowLeft className="h-4 w-4" />Back to settings</Link><header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-medium uppercase tracking-widest text-neutral-500">Notifications</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">Slack notifications</h1><p className="mt-2 max-w-xl text-sm font-light leading-6 text-neutral-500">Send selected Projects activity to the Slack channels your team uses.</p></div>{data?.connected ? <button type="button" onClick={openCreate} className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-neutral-950 px-4 text-sm font-medium text-white transition hover:bg-neutral-800"><Plus className="h-4 w-4" />Create notification</button> : null}</header></div>{error ? <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div> : null}{loading ? <p className="text-sm font-light text-neutral-500">Loading notification settings…</p> : !data?.connected ? <section className="rounded-[28px] bg-white/80 px-6 py-6 shadow-[0_8px_28px_rgba(15,23,42,0.07)]"><p className="font-medium text-foreground">Slack is not connected</p><p className="mt-2 text-sm font-light leading-6 text-neutral-500">Connect Slack first, then return here to create notifications.</p><Link href="/settings/connections/slack" className="mt-5 inline-flex h-9 items-center justify-center rounded-full border border-neutral-300/80 bg-white/70 px-5 text-sm font-medium text-neutral-700 hover:bg-white/90">Connect Slack</Link></section> : <section className="space-y-4">{data.rules.length === 0 ? <div className="rounded-[28px] bg-white/80 px-6 py-12 text-center shadow-[0_8px_28px_rgba(15,23,42,0.07)]"><p className="font-medium text-foreground">No Slack notifications yet</p><p className="mt-2 text-sm font-light text-neutral-500">Create a notification to decide which Project activity should reach Slack.</p></div> : data.rules.map((rule) => <article key={rule.id} className="rounded-[28px] bg-white/80 px-5 py-5 shadow-[0_8px_28px_rgba(15,23,42,0.07)] md:px-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="flex min-w-0 items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-500">{rule.isPrivate ? <Lock className="h-4 w-4" /> : <Hash className="h-4 w-4" />}</span><div><h2 className="font-medium text-foreground">#{rule.channelName}</h2><p className="mt-1 text-sm font-light text-neutral-500">{rule.projectIds.length === 0 ? "All Projects" : rule.projectIds.map(projectName).filter(Boolean).join(", ")}</p></div></div><div className="flex shrink-0 items-center gap-1"><button type="button" onClick={() => openEdit(rule)} className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-sm text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800"><Pencil className="h-3.5 w-3.5" />Edit</button><button type="button" onClick={() => void remove(rule)} className="inline-flex h-8 w-8 items-center justify-center rounded-md text-neutral-400 hover:bg-rose-50 hover:text-rose-600" aria-label="Delete notification"><Trash2 className="h-4 w-4" /></button></div></div><div className="mt-5 flex flex-wrap gap-2">{rule.eventKeys.map((key) => <span key={key} className="rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-600">{EVENT_OPTIONS.find(([eventKey]) => eventKey === key)?.[1] ?? key}</span>)}</div></article>)}</section>}</div>{modalOpen ? <div className="fixed inset-0 z-[200] flex items-center justify-center px-4"><button type="button" aria-label="Close" className="absolute inset-0 bg-black/40" onClick={() => { if (!pending) setModalOpen(false); }} /><div className="relative z-10 w-full max-w-md overflow-visible rounded-xl border border-neutral-200 bg-kenoo-white p-4 shadow-xl"><div className="-mx-4 -mt-4 flex items-center justify-between rounded-t-xl border-b border-neutral-100 bg-kenoo-white px-4 pb-3 pt-4"><h2 className="text-lg font-semibold text-neutral-950">{editing ? "Edit notification" : "Create notification"}</h2><button type="button" onClick={() => setModalOpen(false)} className="rounded-md p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700" aria-label="Close"><X className="h-4 w-4" /></button></div><div className="mt-4 space-y-2"><DropdownField label="Project" placeholder="All Projects" options={projectOptions} multiple exclusiveValue="__all__" value={projectIds.length === 0 ? ["__all__"] : projectIds} onChange={setProjectIds} /><DropdownField label="Events" placeholder="Select events" options={eventOptions} multiple value={eventKeys} onChange={setEventKeys} /><DropdownField label="Slack channel" placeholder="Select a channel" options={channelOptions} value={channelId ? [channelId] : []} onChange={(values) => setChannelId(values[0] ?? "")} /></div><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setModalOpen(false)} className="inline-flex h-10 items-center justify-center rounded-lg bg-neutral-100 px-4 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200">Cancel</button><button type="button" disabled={pending} onClick={() => void save()} className="inline-flex h-10 items-center justify-center rounded-lg bg-neutral-950 px-4 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50">{pending ? "Saving…" : editing ? "Save changes" : "Create notification"}</button></div></div></div> : null}</main>;
}
