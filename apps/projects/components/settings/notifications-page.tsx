"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Check, ChevronDown, Loader2 } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { wallsToast } from "@/components/ui/walls-toast";
import { cn } from "@/lib/utils";

function NotificationChannelSelect({
  notifyEmail,
  loading,
  saving,
  onChange,
}: {
  notifyEmail: boolean;
  loading: boolean;
  saving: boolean;
  onChange: (notifyEmail: boolean) => void;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={loading || saving}
          className={cn(
            "flex min-w-[8.5rem] items-center gap-2 rounded-xl border border-black/[0.06] bg-white/55 px-3 py-1.5 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.95)] backdrop-blur-xl transition",
            "hover:bg-white/80 disabled:opacity-60",
            "outline-none focus-visible:ring-2 focus-visible:ring-[var(--kenoo-sky)]/40",
            open && "bg-white/80",
          )}
        >
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
            {saving ? "Saving…" : notifyEmail ? "Email" : "None"}
          </span>
          <ChevronDown
            className={cn("h-3.5 w-3.5 shrink-0 text-neutral-400 transition-transform", open && "rotate-180")}
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={6} className="w-56 rounded-2xl border-0 bg-kenoo-white p-2 shadow-xl">
        <p className="px-2 pb-1 pt-1 text-xs font-medium text-neutral-500">Notify via</p>
        {[{ label: "Email", enabled: true }, { label: "None", enabled: false }].map((option) => (
          <DropdownMenuItem
            key={option.label}
            onSelect={(event) => {
              event.preventDefault();
              if (option.enabled !== notifyEmail) onChange(option.enabled);
            }}
            className={cn(
              "cursor-pointer rounded-xl px-3 py-2 focus:bg-transparent",
              option.enabled === notifyEmail ? "bg-neutral-100" : "hover:bg-neutral-50",
            )}
          >
            <span className={cn("min-w-0 flex-1 text-sm text-foreground", option.enabled === notifyEmail ? "font-semibold" : "font-medium")}>
              {option.label}
            </span>
            {option.enabled === notifyEmail ? <Check className="h-4 w-4 shrink-0 text-[var(--kenoo-sky)]" strokeWidth={2.75} /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function NotificationsPage() {
  const [taskAssignedEmail, setTaskAssignedEmail] = React.useState(false);
  const [taskBlockerCompletedEmail, setTaskBlockerCompletedEmail] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [savingPreferences, setSavingPreferences] = React.useState<Set<"taskAssigned" | "taskBlockerCompleted">>(new Set());

  function setPreferenceSaving(preference: "taskAssigned" | "taskBlockerCompleted", saving: boolean) {
    setSavingPreferences((current) => {
      const next = new Set(current);
      if (saving) next.add(preference);
      else next.delete(preference);
      return next;
    });
  }

  React.useEffect(() => {
    let active = true;
    void fetch("/api/settings/notifications")
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load notification preferences");
        return response.json() as Promise<{ taskAssignedEmail: boolean; taskBlockerCompletedEmail: boolean }>;
      })
      .then((data) => {
        if (active) setTaskAssignedEmail(data.taskAssignedEmail);
        if (active) setTaskBlockerCompletedEmail(data.taskBlockerCompletedEmail);
      })
      .catch(() => {
        if (active) wallsToast.error("Couldn’t load settings", "Your default preferences are still shown.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  async function updateTaskAssignedEmail(notifyEmail: boolean) {
    const previous = taskAssignedEmail;
    setTaskAssignedEmail(notifyEmail);
    setPreferenceSaving("taskAssigned", true);
    try {
      const response = await fetch("/api/settings/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskAssignedEmail: notifyEmail }),
      });
      if (!response.ok) throw new Error("Unable to save notification preference");
      wallsToast.success("Notification preference saved");
    } catch {
      setTaskAssignedEmail(previous);
      wallsToast.error("Couldn’t save settings", "Please try again.");
    } finally {
      setPreferenceSaving("taskAssigned", false);
    }
  }

  async function updateTaskBlockerCompletedEmail(notifyEmail: boolean) {
    const previous = taskBlockerCompletedEmail;
    setTaskBlockerCompletedEmail(notifyEmail);
    setPreferenceSaving("taskBlockerCompleted", true);
    try {
      const response = await fetch("/api/settings/notifications", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskBlockerCompletedEmail: notifyEmail }),
      });
      if (!response.ok) throw new Error("Unable to save notification preference");
      wallsToast.success("Notification preference saved");
    } catch {
      setTaskBlockerCompletedEmail(previous);
      wallsToast.error("Couldn’t save settings", "Please try again.");
    } finally { setPreferenceSaving("taskBlockerCompleted", false); }
  }

  return (
    <main className="min-h-full w-full bg-kenoo-white px-6 py-8 md:px-10 md:py-12">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-10">
        <div>
          <Link href="/settings" className="mb-6 inline-flex items-center gap-2 text-sm font-light text-neutral-500 transition-colors hover:text-neutral-800">
            <ArrowLeft className="h-4 w-4" />
            Back to settings
          </Link>
          <header>
            <p className="text-xs font-medium uppercase tracking-widest text-neutral-500">Projects</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">Email notifications</h1>
            <p className="mt-2 max-w-xl text-sm font-light leading-6 text-neutral-500">Choose how you receive activity notifications from Projects.</p>
          </header>
        </div>

        <section>
          <div className="mb-4">
            <p className="text-xs font-medium uppercase tracking-widest text-neutral-500">Task assignments</p>
            <p className="mt-1.5 text-sm font-light text-neutral-500">Get notified when someone assigns a task to you.</p>
          </div>
          <div className="flex items-center gap-3 overflow-hidden rounded-2xl bg-white px-4 py-3 shadow-[0_8px_28px_rgba(15,23,42,0.07),inset_0_1px_0_rgba(255,255,255,0.95)] md:px-5">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">New task assignments</p>
              <p className="mt-0.5 text-xs font-light text-neutral-500">When a task is assigned to you in Projects</p>
            </div>
            {loading ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-neutral-400" /> : <NotificationChannelSelect notifyEmail={taskAssignedEmail} loading={loading} saving={savingPreferences.has("taskAssigned")} onChange={(notifyEmail) => void updateTaskAssignedEmail(notifyEmail)} />}
          </div>
        </section>
        <section>
          <div className="mb-4">
            <p className="text-xs font-medium uppercase tracking-widest text-neutral-500">Task blockers</p>
            <p className="mt-1.5 text-sm font-light text-neutral-500">Know when work assigned to you is closer to being ready.</p>
          </div>
          <div className="flex items-center gap-3 overflow-hidden rounded-2xl bg-white px-4 py-3 shadow-[0_8px_28px_rgba(15,23,42,0.07),inset_0_1px_0_rgba(255,255,255,0.95)] md:px-5">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">Blocker completed</p>
              <p className="mt-0.5 text-xs font-light text-neutral-500">When a task blocking one of your tasks is completed</p>
            </div>
            {loading ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-neutral-400" /> : <NotificationChannelSelect notifyEmail={taskBlockerCompletedEmail} loading={loading} saving={savingPreferences.has("taskBlockerCompleted")} onChange={(notifyEmail) => void updateTaskBlockerCompletedEmail(notifyEmail)} />}
          </div>
        </section>
      </div>
    </main>
  );
}
