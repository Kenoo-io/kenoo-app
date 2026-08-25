"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { LayoutGrid, User, UserPlus } from "lucide-react";

import { getSupabaseClient } from "@/lib/auth";
import { useActiveAccount } from "@/components/active-account-context";
import { PageShell } from "@/components/admin/page-shell";

type MemberRow = {
  id: string;
  created_at: string;
  role: string;
  users: {
    first_name: string | null;
    last_name: string | null;
    email: string;
    avatar_url: string | null;
  } | null;
};

type AppAccessRow = {
  id: string;
  slug: string;
  name: string;
  icon_url: string | null;
};

function memberDisplayName(member: MemberRow): string {
  const user = member.users;
  if (!user) return "Unknown member";
  const full = `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim();
  return full || user.email;
}

export function AdminDashboard() {
  const { activeAccount, activeAccountId, loading: accountLoading } =
    useActiveAccount();
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [apps, setApps] = useState<AppAccessRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeAccountId || accountLoading) {
      setLoading(accountLoading);
      return;
    }

    let isMounted = true;
    const supabase = getSupabaseClient();
    const accountId = activeAccountId;

    async function load() {
      setLoading(true);
      try {
        const [
          { data: memberRows, error: membersError },
          { data: accessRows, error: accessError },
        ] = await Promise.all([
          supabase
            .from("account_users")
            .select(
              `id, created_at, role, users ( first_name, last_name, email, avatar_url )`,
            )
            .eq("account_id", accountId)
            .order("created_at", { ascending: false }),
          supabase
            .from("account_app_access")
            .select("app_id, apps(id, slug, name, icon_url)")
            .eq("account_id", accountId),
        ]);

        if (!isMounted) return;

        if (!membersError) {
          setMembers(
            (memberRows ?? []).map((row) => {
              const userRaw = row.users;
              const user = Array.isArray(userRaw) ? userRaw[0] : userRaw;
              return {
                id: row.id as string,
                created_at: row.created_at as string,
                role: row.role as string,
                users: user ?? null,
              };
            }),
          );
        }

        if (!accessError) {
          setApps(
            (accessRows ?? [])
              .map((row) => {
                const appRaw = row.apps;
                const app = Array.isArray(appRaw) ? appRaw[0] : appRaw;
                if (!app) return null;
                return {
                  id: app.id as string,
                  slug: app.slug as string,
                  name: app.name as string,
                  icon_url: (app.icon_url as string | null) ?? null,
                };
              })
              .filter((app): app is AppAccessRow => app !== null),
          );
        }
      } catch {
        // partial data is fine
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    void load();
    return () => {
      isMounted = false;
    };
  }, [activeAccountId, accountLoading]);

  const activeCount = useMemo(() => members.length, [members]);
  const isLoading = loading || accountLoading;
  const displayName = activeAccount?.name ?? "your workspace";

  return (
    <PageShell title="Home">
      {!activeAccountId && !accountLoading ? (
        <EmptyState
          title="No account selected"
          body="Choose a workspace from the sidebar to view its admin home."
        />
      ) : isLoading ? (
        <div className="space-y-6">
          <div className="h-40 animate-pulse rounded-xl bg-[#F3F3F4]" />
          <div className="h-36 animate-pulse rounded-xl border border-neutral-200" />
        </div>
      ) : (
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
                {displayName}
              </h2>
              <p className="mt-1.5 text-sm leading-6 text-neutral-600">
                Manage users, apps, and billing for this workspace. Changes stay
                with the account so teammates see the same data.
              </p>
              <Link
                href="/users?invite=1"
                className="mt-4 inline-flex rounded-lg bg-neutral-950 px-3.5 py-2 text-sm font-medium text-kenoo-white hover:bg-neutral-800"
              >
                Add a user
              </Link>
            </div>
          </section>

          <div className="grid overflow-hidden rounded-xl border border-neutral-200 sm:grid-cols-3">
            <MetricCard
              label="Users"
              value={String(activeCount)}
              href="/users"
              action="Manage users"
            />
            <MetricCard
              label="Enabled apps"
              value={String(apps.length)}
              href={activeAccountId ? `/accounts/${activeAccountId}` : "/"}
              action="Manage apps"
            />
            <MetricCard
              label="Plan"
              value="Starter"
              href="/billing"
              action="Billing"
            />
          </div>

          <section className="overflow-hidden rounded-xl border border-neutral-200">
            <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold text-neutral-950">
                  People
                </h2>
                <p className="mt-0.5 text-[13px] text-neutral-500">
                  Recent members in this workspace
                </p>
              </div>
              <Link
                href="/users"
                className="text-[13px] font-medium text-neutral-700 hover:text-neutral-950"
              >
                View all
              </Link>
            </div>
            {members.slice(0, 5).length > 0 ? (
              <ul>
                {members.slice(0, 5).map((member) => (
                  <li
                    key={member.id}
                    className="flex items-center gap-3 border-b border-neutral-100 px-5 py-3 last:border-0"
                  >
                    <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-neutral-100">
                      {member.users?.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={member.users.avatar_url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <User className="h-3.5 w-3.5 text-neutral-400" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-neutral-900">
                        {memberDisplayName(member)}
                      </p>
                      <p className="truncate text-xs capitalize text-neutral-400">
                        {member.role}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-5 py-10 text-center">
                <UserPlus className="mx-auto h-6 w-6 text-neutral-300" />
                <p className="mt-2 text-sm text-neutral-500">No members yet</p>
              </div>
            )}
          </section>

          {apps.length > 0 ? (
            <section className="overflow-hidden rounded-xl border border-neutral-200">
              <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
                <h2 className="text-sm font-semibold text-neutral-950">Apps</h2>
                {activeAccountId ? (
                  <Link
                    href={`/accounts/${activeAccountId}`}
                    className="text-[13px] font-medium text-neutral-700 hover:text-neutral-950"
                  >
                    Manage
                  </Link>
                ) : null}
              </div>
              <ul>
                {apps.slice(0, 6).map((app) => (
                  <li
                    key={app.id}
                    className="flex items-center gap-3 border-b border-neutral-100 px-5 py-3 last:border-0"
                  >
                    <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-neutral-100">
                      {app.icon_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={app.icon_url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <LayoutGrid className="h-3.5 w-3.5 text-neutral-400" />
                      )}
                    </div>
                    <p className="truncate text-sm font-medium text-neutral-900">
                      {app.name}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      )}
    </PageShell>
  );
}

function MetricCard({
  label,
  value,
  href,
  action,
}: {
  label: string;
  value: string;
  href: string;
  action?: string;
}) {
  return (
    <div className="border-b border-neutral-200 p-5 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
      <p className="text-sm text-neutral-500">{label}</p>
      <p className="mt-3 text-[28px] font-semibold tracking-tight">{value}</p>
      <Link
        href={href}
        className="mt-4 inline-flex rounded-lg border border-neutral-200 bg-kenoo-white px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
      >
        {action ?? "View"}
      </Link>
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 px-6 py-16 text-center">
      <p className="text-sm font-medium text-neutral-900">{title}</p>
      <p className="mt-1 text-sm text-neutral-500">{body}</p>
    </div>
  );
}
