"use client";

import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  Building2,
  LayoutGrid,
  Mail,
  User as UserIcon,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { PageBody } from "@/components/admin/page-shell";
import { cn } from "@/lib/utils";

export type AccountDetail = {
  id: string;
  created_at: string;
  updated_at: string | null;
  account_type: "personal" | "organization";
  name: string;
  slug: string | null;
  icon_url: string | null;
  website: string | null;
  description: string | null;
  email: string | null;
  phone: string | null;
  personal_owner_id: string | null;
  member_count: number;
  app_access?: { id: string; slug: string; name: string; icon_url: string | null }[];
};

interface AdminAccountDetailProps {
  account: AccountDetail;
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function MetaRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-neutral-100 py-3 last:border-0">
      <dt className="shrink-0 text-sm text-neutral-500">{label}</dt>
      <dd className="min-w-0 text-right text-sm text-neutral-950">{children}</dd>
    </div>
  );
}

export function AdminAccountDetail({ account }: AdminAccountDetailProps) {
  const isOrg = account.account_type === "organization";
  const apps = account.app_access ?? [];

  return (
    <PageBody>
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-neutral-500 transition-colors hover:text-neutral-950"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Home
        </Link>
      </div>

      <header className="flex flex-wrap items-start gap-4">
        <Avatar className="h-14 w-14 shrink-0 rounded-xl">
          <AvatarImage src={account.icon_url ?? undefined} alt={account.name} />
          <AvatarFallback className="rounded-xl bg-neutral-100 text-sm font-medium text-neutral-500">
            {account.name.slice(0, 2).toUpperCase() || "?"}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[28px] font-semibold tracking-tight text-neutral-950">
              {account.name}
            </h1>
            <Badge
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-medium",
                "bg-neutral-100 text-neutral-800 hover:bg-neutral-100",
              )}
            >
              {isOrg ? "Organization" : "Personal"}
            </Badge>
          </div>
          <p className="text-sm text-neutral-500">
            {account.slug ?? account.email ?? "No slug"}
          </p>
        </div>
      </header>

      <div className="overflow-hidden rounded-xl border border-neutral-200 lg:grid lg:grid-cols-5">
        <section className="border-b border-neutral-200 p-6 lg:col-span-3 lg:border-b-0 lg:border-r">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-neutral-950">Apps</h2>
              <p className="mt-0.5 text-[13px] text-neutral-500">
                Apps enabled for this account
              </p>
            </div>
            <LayoutGrid className="h-5 w-5 text-neutral-400" />
          </div>

          {apps.length === 0 ? (
            <div className="rounded-lg bg-[#F3F3F4] px-4 py-10 text-center">
              <LayoutGrid className="mx-auto h-8 w-8 text-neutral-300" />
              <p className="mt-3 text-sm font-medium text-neutral-900">
                No apps yet
              </p>
              <p className="mt-1 text-sm text-neutral-500">
                App access will show here once it is granted.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {apps.map((app) => (
                <li
                  key={app.id}
                  className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                >
                  {app.icon_url ? (
                    <Image
                      src={app.icon_url}
                      alt=""
                      width={36}
                      height={36}
                      className="h-9 w-9 shrink-0 rounded-lg object-contain"
                    />
                  ) : (
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-xs font-medium text-neutral-500">
                      {app.name.slice(0, 1)}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-neutral-950">
                      {app.name}
                    </p>
                    <p className="truncate text-xs text-neutral-400">{app.slug}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="lg:col-span-2">
          <section className="border-b border-neutral-200 p-6">
            <div className="mb-4 flex items-center gap-2">
              {isOrg ? (
                <Building2 className="h-4 w-4 text-neutral-400" />
              ) : (
                <UserIcon className="h-4 w-4 text-neutral-400" />
              )}
              <h2 className="text-sm font-semibold text-neutral-950">Details</h2>
            </div>
            <dl>
              <MetaRow label="Type">
                <span className="capitalize">{account.account_type}</span>
              </MetaRow>
              <MetaRow label="Slug">
                {account.slug ?? <span className="text-neutral-400">—</span>}
              </MetaRow>
              <MetaRow label="Members">{account.member_count}</MetaRow>
              <MetaRow label="Created">{formatDate(account.created_at)}</MetaRow>
              <MetaRow label="ID">
                <code className="break-all font-mono text-xs text-neutral-500">
                  {account.id}
                </code>
              </MetaRow>
            </dl>
          </section>

          <section className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <Mail className="h-4 w-4 text-neutral-400" />
              <h2 className="text-sm font-semibold text-neutral-950">Contact</h2>
            </div>
            <dl>
              <MetaRow label="Email">
                {account.email ?? <span className="text-neutral-400">—</span>}
              </MetaRow>
              <MetaRow label="Phone">
                {account.phone ?? <span className="text-neutral-400">—</span>}
              </MetaRow>
              <MetaRow label="Website">
                {account.website ? (
                  <a
                    href={account.website}
                    target="_blank"
                    rel="noreferrer"
                    className="break-all text-neutral-800 hover:text-neutral-950 hover:underline"
                  >
                    {account.website}
                  </a>
                ) : (
                  <span className="text-neutral-400">—</span>
                )}
              </MetaRow>
              <MetaRow label="About">
                {account.description ?? (
                  <span className="text-neutral-400">—</span>
                )}
              </MetaRow>
            </dl>
            {isOrg ? (
              <Link
                href="/account"
                className="mt-4 inline-block text-sm font-medium text-neutral-800 hover:text-neutral-950"
              >
                Edit account profile
              </Link>
            ) : null}
          </section>
        </div>
      </div>
    </PageBody>
  );
}
