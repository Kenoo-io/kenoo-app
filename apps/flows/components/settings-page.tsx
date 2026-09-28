"use client";

import { ChevronRight, Code2, Webhook } from "lucide-react";
import Link from "next/link";

import { cn } from "@walls/utils";

const panelGlassClass =
  "bg-white/80 backdrop-blur-xl shadow-[0_8px_28px_rgba(15,23,42,0.07),inset_0_1px_0_rgba(255,255,255,0.95)]";

function SectionLabel({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-5">
      <p className="text-xs font-medium uppercase tracking-widest text-neutral-500">{title}</p>
      {description ? <p className="mt-1.5 text-sm font-light text-neutral-500">{description}</p> : null}
    </div>
  );
}

function SettingsActionPanel({ title, description, href, actionLabel }: { title: string; description: string; href: string; actionLabel: string }) {
  return (
    <div className={cn("overflow-hidden rounded-[28px] px-4 py-5 md:px-6 md:py-6", panelGlassClass)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="font-medium text-foreground">{title}</p>
          <p className="mt-1 text-sm font-light leading-6 text-neutral-500">{description}</p>
        </div>
        <Link href={href} className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-[var(--kenoo-sky)] transition-opacity hover:opacity-80">
          {actionLabel}
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

function IntegrationRow({ icon: Icon, title, status, href }: { icon: typeof Code2; title: string; status: string; href: string }) {
  return (
    <Link href={href} className={cn("group flex items-center gap-3 rounded-2xl px-4 py-3 transition-colors duration-200", "hover:bg-white/95", panelGlassClass)}>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center text-neutral-700"><Icon className="h-6 w-6" strokeWidth={1.5} /></span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="mt-0.5 truncate text-xs font-light text-neutral-500">{status}</p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-neutral-400 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-neutral-600" />
    </Link>
  );
}

export function FlowsSettingsPage() {
  return (
    <main className="min-h-full w-full bg-kenoo-white px-6 pb-8 pt-4 md:px-10 md:pb-12 md:pt-6">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-14">
        <header>
          <p className="text-xs font-medium uppercase tracking-widest text-neutral-500">Workspace</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">Settings</h1>
        </header>

        <section>
          <SectionLabel title="Connected sources" />
          <div className="flex flex-col gap-2">
            <IntegrationRow href="/settings/api-keys" icon={Code2} title="Event API" status="Send customer events into your flows" />
            <IntegrationRow href="/settings/webhooks" icon={Webhook} title="Webhooks" status="Receive events from your connected tools" />
          </div>
        </section>

        <section>
          <SectionLabel title="Developer access" />
          <SettingsActionPanel title="Manage API keys" description="Create and rotate keys for sending events from your server, store, or other integrations." href="/settings/api-keys" actionLabel="Manage API keys" />
        </section>

        <section>
          <SectionLabel title="Event tracking" />
          <SettingsActionPanel title="Manage event tracking" description="Choose which attribution and customer consent signals Flows should attach to incoming events." href="/settings/tracking" actionLabel="Manage tracking" />
        </section>

        <section>
          <SectionLabel title="Flow delivery" />
          <SettingsActionPanel title="Manage delivery settings" description="Set default sending windows, unsubscribe behavior, and delivery preferences for new flows." href="/settings/delivery" actionLabel="Manage delivery" />
        </section>

        <section>
          <SectionLabel title="Alerts" />
          <SettingsActionPanel title="Manage alerts" description="Choose how your team is notified about flow errors, delivery issues, and weekly performance." href="/settings/alerts" actionLabel="Manage alerts" />
        </section>

        <section>
          <SectionLabel title="Documentation" />
          <SettingsActionPanel title="Event API documentation" description="Learn how to define custom events and trigger flows from your product." href="/documentation" actionLabel="View documentation" />
        </section>
      </div>
    </main>
  );
}
