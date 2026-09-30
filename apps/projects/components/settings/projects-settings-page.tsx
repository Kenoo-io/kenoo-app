"use client";

import { ChevronRight, Github } from "lucide-react";
import Link from "next/link";

import { useGitHubConnection } from "@/lib/github-connection";
import { useSlackConnection } from "@/lib/slack-connection";
import { SlackLogo } from "@/components/ui/slack-logo";

function SectionLabel({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-5">
      <p className="text-xs font-medium uppercase tracking-widest text-neutral-500">{title}</p>
      {description ? <p className="mt-1.5 text-sm font-light text-neutral-500">{description}</p> : null}
    </div>
  );
}

function SettingsActionPanel({
  title,
  description,
  href,
  actionLabel,
}: {
  title: string;
  description: string;
  href: string;
  actionLabel: string;
}) {
  return (
    <div className="overflow-hidden rounded-[28px] bg-white px-5 py-5 shadow-[0_12px_40px_rgba(15,23,42,0.06)] md:px-6 md:py-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="font-medium text-foreground">{title}</p>
          <p className="mt-1 text-sm font-light leading-6 text-neutral-500">{description}</p>
        </div>
        <Link
          href={href}
          className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-[var(--kenoo-sky)] transition-opacity hover:opacity-80"
        >
          {actionLabel}
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

export function ProjectsSettingsPage() {
  const { connection: githubConnection, loading: githubLoading } =
    useGitHubConnection();
  const { connection: slackConnection, loading: slackLoading } = useSlackConnection();

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
          <Link
            href="/settings/connections/slack"
            className="group mt-2 flex items-center gap-3 rounded-2xl bg-white/80 px-4 py-3 shadow-[0_8px_28px_rgba(15,23,42,0.07),inset_0_1px_0_rgba(255,255,255,0.95)] backdrop-blur-xl transition-colors duration-200 hover:bg-white/95"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center"><SlackLogo className="h-6 w-6" /></span>
            <span className="min-w-0 flex-1"><span className="block text-sm font-medium text-foreground">Slack</span><span className={`mt-0.5 block text-xs font-light ${slackConnection ? "text-emerald-700" : "text-neutral-500"}`}>{slackLoading ? "Checking connection…" : slackConnection ? slackConnection.teamName ?? "Connected" : "Connect a workspace for project notifications"}</span></span>
            <ChevronRight className="h-4 w-4 shrink-0 text-neutral-400 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-neutral-600" />
          </Link>
        </section>

        <section>
          <SectionLabel title="Notification settings" />
          <SettingsActionPanel
            title="Manage email notifications"
            description="Choose how Projects activity notifications are delivered to you."
            href="/settings/notifications/email"
            actionLabel="Manage notifications"
          />
          <div className="mt-2">
            <SettingsActionPanel
              title="Manage Kenoo notifications"
              description="Choose whether Projects activity appears in your header notification inbox."
              href="/settings/notifications/kenoo"
              actionLabel="Manage notifications"
            />
          </div>
          <div className="mt-2">
            <SettingsActionPanel
              title="Manage Slack notifications"
              description="Choose which Slack channels receive Projects activity notifications."
              href="/settings/notifications/slack"
              actionLabel="Manage notifications"
          />
          </div>
        </section>

        <section>
          <SectionLabel title="Workflow settings" />
          <SettingsActionPanel
            title="Manage Slack user mappings"
            description="Connect Projects users to their Slack identities for true mentions."
            href="/settings/notifications/slack/users"
            actionLabel="Manage mappings"
          />
          <div className="mt-2">
            <SettingsActionPanel
              title="Manage GitHub task automation"
              description="Choose when linked Projects tasks are marked complete from GitHub activity."
              href="/settings/workflow/github"
              actionLabel="Manage automation"
            />
          </div>
        </section>
      </div>
    </main>
  );
}
