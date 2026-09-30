"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useAuth } from "@walls/auth";

import { useActiveAccount } from "@/components/active-account-context";
import { wallsToast } from "@/components/ui/walls-toast";
import { NotificationChannelSelect } from "@/components/settings/notifications-page";

const EVENT_OPTIONS = [
  ["projectMemberAdded", "Added to a project", "When someone adds you to a Projects project."],
  ["taskAssigned", "Task assigned to you", "When a task is assigned to you."],
  ["taskCompleted", "Task completed", "When someone completes a task you assigned."],
  ["taskBlockerCompleted", "Task blocker completed", "When a blocker is completed and your task is affected."],
] as const;
type EventName = (typeof EVENT_OPTIONS)[number][0];

export function KenooNotificationsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { activeAccountId, loading: accountLoading } = useActiveAccount();
  const [events, setEvents] = React.useState<Record<EventName, boolean>>({ projectMemberAdded: true, taskAssigned: true, taskCompleted: true, taskBlockerCompleted: true });
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState<EventName | null>(null);

  React.useEffect(() => {
    if (authLoading || accountLoading || !user || !activeAccountId) return;
    let active = true;
    void fetch(`/api/settings/notifications?accountId=${encodeURIComponent(activeAccountId)}`)
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load notification preferences");
        return response.json() as Promise<{ internalEvents?: Partial<Record<EventName, boolean>> }>;
      })
      .then((data) => { if (active && data.internalEvents) setEvents((previous) => ({ ...previous, ...data.internalEvents })); })
      .catch(() => { if (active) wallsToast.error("Couldn’t load settings", "Your default preferences are still shown."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [accountLoading, activeAccountId, authLoading, user]);

  async function update(event: EventName, value: boolean) {
    const previous = events[event];
    setEvents((current) => ({ ...current, [event]: value }));
    setSaving(event);
    try {
      const response = await fetch(`/api/settings/notifications?accountId=${encodeURIComponent(activeAccountId ?? "")}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ internalEvents: { [event]: value } }) });
      if (!response.ok) throw new Error("Unable to save notification preference");
      wallsToast.success("Notification preference saved");
    } catch {
      setEvents((current) => ({ ...current, [event]: previous }));
      wallsToast.error("Couldn’t save settings", "Please try again.");
    } finally { setSaving(null); }
  }

  return <main className="min-h-full w-full bg-kenoo-white px-6 py-8 md:px-10 md:py-12"><div className="mx-auto flex w-full max-w-3xl flex-col gap-10"><div><Link href="/settings" className="mb-6 inline-flex items-center gap-2 text-sm font-light text-neutral-500 transition-colors hover:text-neutral-800"><ArrowLeft className="h-4 w-4" />Back to settings</Link><header><p className="text-xs font-medium uppercase tracking-widest text-neutral-500">Projects</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">In-app notifications</h1><p className="mt-2 max-w-xl text-sm font-light leading-6 text-neutral-500">Choose which Projects activity appears in the notification icon in your header.</p></header></div><section><div className="mb-4"><p className="text-xs font-medium uppercase tracking-widest text-neutral-500">Header notifications</p><p className="mt-1.5 text-sm font-light text-neutral-500">Control each type of Projects activity shown in the app.</p></div><div className="space-y-3">{EVENT_OPTIONS.map(([event, title, description]) => <div key={event} className="flex items-center gap-3 overflow-hidden rounded-2xl bg-white px-4 py-3 shadow-[0_8px_28px_rgba(15,23,42,0.07),inset_0_1px_0_rgba(255,255,255,0.95)] md:px-5"><div className="min-w-0 flex-1"><p className="text-sm font-medium text-foreground">{title}</p><p className="mt-0.5 text-xs font-light text-neutral-500">{description}</p></div>{loading ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-neutral-400" /> : <NotificationChannelSelect notifyEmail={events[event]} enabledLabel="On" disabledLabel="Off" loading={loading} saving={saving === event} onChange={(value) => void update(event, value)} />}</div>)}</div></section></div></main>;
}
