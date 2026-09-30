"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useAuth } from "@walls/auth";

import { useActiveAccount } from "@/components/active-account-context";
import { wallsToast } from "@/components/ui/walls-toast";
import { NotificationChannelSelect } from "@/components/settings/notifications-page";

export function KenooNotificationsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { activeAccountId, loading: accountLoading } = useActiveAccount();
  const [enabled, setEnabled] = React.useState(true);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (authLoading || accountLoading || !user || !activeAccountId) return;
    let active = true;
    void fetch("/api/settings/notifications")
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load notification preferences");
        return response.json() as Promise<{ internalNotifications?: boolean }>;
      })
      .then((data) => { if (active) setEnabled(data.internalNotifications ?? true); })
      .catch(() => { if (active) wallsToast.error("Couldn’t load settings", "Your default preference is still shown."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [accountLoading, activeAccountId, authLoading, user]);

  async function update(enabledValue: boolean) {
    const previous = enabled;
    setEnabled(enabledValue);
    setSaving(true);
    try {
      const response = await fetch("/api/settings/notifications", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ internalNotifications: enabledValue }) });
      if (!response.ok) throw new Error("Unable to save notification preference");
      wallsToast.success("Notification preference saved");
    } catch {
      setEnabled(previous);
      wallsToast.error("Couldn’t save settings", "Please try again.");
    } finally { setSaving(false); }
  }

  return <main className="min-h-full w-full bg-kenoo-white px-6 py-8 md:px-10 md:py-12"><div className="mx-auto flex w-full max-w-3xl flex-col gap-10"><div><Link href="/settings" className="mb-6 inline-flex items-center gap-2 text-sm font-light text-neutral-500 transition-colors hover:text-neutral-800"><ArrowLeft className="h-4 w-4" />Back to settings</Link><header><p className="text-xs font-medium uppercase tracking-widest text-neutral-500">Projects</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">Kenoo notifications</h1><p className="mt-2 max-w-xl text-sm font-light leading-6 text-neutral-500">Choose whether Projects activity appears in the notification icon in your header.</p></header></div><section><div className="mb-4"><p className="text-xs font-medium uppercase tracking-widest text-neutral-500">Header notifications</p><p className="mt-1.5 text-sm font-light text-neutral-500">Control the Projects activity inbox shown in Kenoo.</p></div><div className="flex items-center gap-3 overflow-hidden rounded-2xl bg-white px-4 py-3 shadow-[0_8px_28px_rgba(15,23,42,0.07),inset_0_1px_0_rgba(255,255,255,0.95)] md:px-5"><div className="min-w-0 flex-1"><p className="text-sm font-medium text-foreground">Projects notification inbox</p><p className="mt-0.5 text-xs font-light text-neutral-500">Task assignments, project membership, and task progress</p></div>{loading ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-neutral-400" /> : <NotificationChannelSelect notifyEmail={enabled} enabledLabel="On" disabledLabel="Off" loading={loading} saving={saving} onChange={(value) => void update(value)} />}</div></section></div></main>;
}
