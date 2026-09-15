"use client";

import { useEffect, useState } from "react";
import { ChevronRight, Github, Mail } from "lucide-react";
import Link from "next/link";

import { Switch } from "@/components/ui/switch";
import { wallsToast } from "@/components/ui/walls-toast";
import { useGitHubConnection } from "@/lib/github-connection";

function SectionLabel({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-5">
      <p className="text-xs font-medium uppercase tracking-widest text-neutral-500">{title}</p>
      {description ? <p className="mt-1.5 text-sm font-light text-neutral-500">{description}</p> : null}
    </div>
  );
}

export function ProjectsSettingsPage() {
  const [taskAssignedEmail, setTaskAssignedEmail] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { connection: githubConnection, loading: githubLoading } =
    useGitHubConnection();

  useEffect(() => {
    let active = true;
    void fetch("/api/settings/notifications")
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load notification preferences");
        return response.json() as Promise<{ taskAssignedEmail: boolean }>;
      })
      .then((data) => {
        if (active) setTaskAssignedEmail(data.taskAssignedEmail);
      })
      .catch(() => {
        if (active) wallsToast.error("Couldn’t load settings", "Your default preferences are still shown.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  async function updateTaskAssignedEmail(checked: boolean) {
    const previous = taskAssignedEmail;
    setTaskAssignedEmail(checked);
    setSaving(true);
    try {
      const response = await fetch("/api/settings/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskAssignedEmail: checked }),
      });
      if (!response.ok) throw new Error("Unable to save notification preference");
      wallsToast.success("Notification preference saved");
    } catch {
      setTaskAssignedEmail(previous);
      wallsToast.error("Couldn’t save settings", "Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-full w-full bg-kenoo-white px-6 pb-12 pt-6 md:px-10">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-14">
        <header>
          <p className="text-xs font-medium uppercase tracking-widest text-neutral-500">Projects</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">Settings</h1>
        </header>

        <section>
          <SectionLabel title="Connected Accounts" />
          <Link
            href="/settings/connections/github"
            className="group flex items-center gap-3 rounded-2xl bg-white/80 px-4 py-3 shadow-[0_8px_28px_rgba(15,23,42,0.07),inset_0_1px_0_rgba(255,255,255,0.95)] backdrop-blur-xl transition-colors duration-200 hover:bg-white/95"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center text-neutral-900">
              <Github className="h-6 w-6" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-foreground">GitHub</span>
              <span
                className={`mt-0.5 block text-xs font-light ${githubConnection ? "text-emerald-700" : "text-neutral-500"}`}
              >
                {githubLoading
                  ? "Checking connection…"
                  : githubConnection
                    ? githubConnection.token_payload?.account_login ?? "Connected"
                    : "Not connected"}
              </span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-neutral-400 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-neutral-600" />
          </Link>
        </section>

        <section>
          <SectionLabel title="Email notifications" description="Control which project activity reaches your inbox." />
          <div className="overflow-hidden rounded-[28px] border border-neutral-200/80 bg-white px-5 py-5 shadow-[0_12px_40px_rgba(15,23,42,0.06)] md:px-6">
            <div className="flex items-start gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-[var(--kenoo-sky)]">
                <Mail className="h-5 w-5 stroke-[1.7]" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">New task assignments</p>
                    <p className="mt-1 max-w-lg text-sm font-light leading-6 text-neutral-500">
                      Email me when someone assigns a task to me in Projects.
                    </p>
                  </div>
                  <Switch
                    size="md"
                    checked={taskAssignedEmail}
                    disabled={loading || saving}
                    onCheckedChange={updateTaskAssignedEmail}
                    aria-label="Email me for new task assignments"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
