"use client";

import { useEffect, useState } from "react";
import { Bell, Github, Mail } from "lucide-react";

import { Switch } from "@/components/ui/switch";
import { wallsToast } from "@/components/ui/walls-toast";

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
      <div className="app-sidebar-pad mx-auto flex w-full max-w-3xl flex-col gap-14">
        <header>
          <p className="text-xs font-medium uppercase tracking-widest text-neutral-500">Projects</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">Settings</h1>
          <p className="mt-3 max-w-xl text-sm font-light leading-6 text-neutral-500">
            Choose how Projects communicates with you. These preferences are personal to your account.
          </p>
        </header>

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

        <section>
          <SectionLabel title="Connected accounts" description="Connections for project workflows and technical work." />
          <div className="overflow-hidden rounded-[28px] border border-neutral-200/80 bg-white px-5 py-5 shadow-[0_12px_40px_rgba(15,23,42,0.06)] md:px-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-800"><Github className="h-5 w-5" /></span>
                <div>
                  <p className="text-sm font-medium text-foreground">GitHub</p>
                  <p className="mt-1 max-w-lg text-sm font-light leading-6 text-neutral-500">
                    Connect GitHub to link repositories and technical projects. OAuth setup is coming soon.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => wallsToast.warning("GitHub OAuth is coming soon", "The connection screen is ready; authorization will be added next.")}
                className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full bg-neutral-100 px-4 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-200"
              >
                <Bell className="h-4 w-4" /> Connect GitHub
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
