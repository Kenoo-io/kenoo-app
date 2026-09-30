"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { useGitHubConnection } from "@/lib/github-connection";
import { GitHubAutomationSettings } from "@/components/settings/github-automation-settings";

export default function GitHubWorkflowSettingsPage() {
  const { connection, loading } = useGitHubConnection();

  return (
    <main className="min-h-full w-full bg-kenoo-white px-6 py-8 md:px-10 md:py-12">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <div>
          <Link href="/settings" className="mb-6 inline-flex items-center gap-2 text-sm font-light text-neutral-500 transition-colors hover:text-neutral-800">
            <ArrowLeft className="h-4 w-4" />
            Back to settings
          </Link>
          <p className="text-xs font-medium uppercase tracking-widest text-neutral-500">Workflow settings</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">GitHub task automation</h1>
          <p className="mt-2 max-w-2xl text-sm font-light leading-6 text-neutral-500">Choose when linked Projects tasks are marked complete from GitHub activity.</p>
        </div>
        {loading ? <section className="animate-pulse overflow-hidden rounded-[28px] bg-white/80 px-4 py-5 shadow-[0_8px_28px_rgba(15,23,42,0.07),inset_0_1px_0_rgba(255,255,255,0.95)] backdrop-blur-xl md:px-6 md:py-6" aria-label="Loading GitHub workflow settings"><div className="space-y-6"><div className="h-12 w-full max-w-sm rounded-2xl bg-neutral-100" /><div className="space-y-2"><div className="h-5 w-64 rounded bg-neutral-100" /><div className="h-4 w-full max-w-xl rounded bg-neutral-100" /></div><div className="h-12 w-full max-w-sm rounded-2xl bg-neutral-100" /><div className="h-12 w-full max-w-sm rounded-2xl bg-neutral-100" /><div className="h-9 w-36 rounded-lg bg-neutral-100" /></div></section> : connection ? <GitHubAutomationSettings connectionId={connection.id} /> : <section className="rounded-[28px] bg-white/80 px-6 py-8 shadow-[0_8px_28px_rgba(15,23,42,0.07)]"><p className="font-medium text-foreground">GitHub is not connected</p><p className="mt-2 text-sm font-light text-neutral-500">Connect GitHub before configuring task automation.</p><Link href="/settings/connections/github" className="mt-5 inline-flex h-9 items-center rounded-full bg-neutral-950 px-5 text-sm font-medium text-white hover:bg-neutral-800">Connect GitHub</Link></section>}
      </div>
    </main>
  );
}
