"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FileDown, LayoutGrid, ListTodo, UserCircle, Users } from "lucide-react";

import { getSupabaseClient } from "@/lib/auth";

type Counts = {
  users: number;
  apps: number;
  jobs: number;
  teams: number;
};

const shortcuts = [
  {
    href: "/users",
    label: "Users",
    description: "Create and manage every Kenoo user.",
    icon: UserCircle,
  },
  {
    href: "/apps",
    label: "Apps",
    description: "Directory slugs, icons, and active flags.",
    icon: LayoutGrid,
  },
  {
    href: "/jobs",
    label: "Jobs",
    description: "Careers listings and hiring internals.",
    icon: ListTodo,
  },
  {
    href: "/teams",
    label: "Teams",
    description: "Internal teams and member records.",
    icon: Users,
  },
] as const;

export function ConsoleDashboard() {
  const [counts, setCounts] = useState<Counts | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = getSupabaseClient();

    Promise.all([
      supabase.from("users").select("id", { count: "exact", head: true }),
      supabase.from("apps").select("id", { count: "exact", head: true }),
      supabase.from("jobs").select("id", { count: "exact", head: true }),
      supabase.from("team_groups").select("id", { count: "exact", head: true }),
    ]).then(([users, apps, jobs, teams]) => {
      if (cancelled) return;
      setCounts({
        users: users.count ?? 0,
        apps: apps.count ?? 0,
        jobs: jobs.count ?? 0,
        teams: teams.count ?? 0,
      });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-xl bg-[#F3F3F4] px-6 py-6">
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-1/2 opacity-80"
          style={{
            background:
              "radial-gradient(circle at 70% 40%, rgba(196,181,253,0.7), transparent 55%), radial-gradient(circle at 90% 80%, rgba(253,224,71,0.55), transparent 50%), radial-gradient(circle at 50% 90%, rgba(110,231,183,0.45), transparent 45%)",
          }}
        />
        <div className="relative max-w-lg">
          <h2 className="text-lg font-semibold tracking-tight text-neutral-950">
            Internal Kenoo console
          </h2>
          <p className="mt-1.5 text-sm leading-6 text-neutral-600">
            This surface is limited to console operators. Use it to edit
            system-wide users, apps, jobs, and teams — not tenant Admin.
          </p>
        </div>
      </section>

      <div className="grid overflow-hidden rounded-xl border border-neutral-200 sm:grid-cols-4">
        <MetricCard label="Users" value={counts?.users} href="/users" />
        <MetricCard label="Apps" value={counts?.apps} href="/apps" />
        <MetricCard label="Jobs" value={counts?.jobs} href="/jobs" />
        <MetricCard label="Teams" value={counts?.teams} href="/teams" />
      </div>

      <section className="flex flex-col gap-4 rounded-xl border border-neutral-200 bg-kenoo-white p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-xl">
          <p className="text-sm font-semibold text-neutral-950">
            Google Ads API access
          </p>
          <p className="mt-1 text-sm leading-6 text-neutral-500">
            Download the AdPilot Basic Access packet for Google — company
            answers plus Kenoo app mockups you can attach to the form.
          </p>
        </div>
        <Link
          href="/google-ads-access?download=1"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-neutral-950 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800"
        >
          <FileDown className="h-4 w-4" />
          Download application
        </Link>
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        {shortcuts.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-xl border border-neutral-200 bg-kenoo-white p-5 transition-colors hover:bg-neutral-50"
            >
              <Icon className="h-4 w-4 text-neutral-400" />
              <p className="mt-3 text-sm font-semibold text-neutral-950">
                {item.label}
              </p>
              <p className="mt-1 text-sm leading-6 text-neutral-500">
                {item.description}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  href,
}: {
  label: string;
  value: number | undefined;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="border-b border-neutral-200 p-5 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0"
    >
      <p className="text-sm text-neutral-500">{label}</p>
      <p className="mt-3 text-[28px] font-semibold tracking-tight">
        {value == null ? "—" : value.toLocaleString()}
      </p>
    </Link>
  );
}
