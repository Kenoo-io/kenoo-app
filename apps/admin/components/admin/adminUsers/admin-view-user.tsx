"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Mail, Trash2 } from "lucide-react";

import { wallsToast } from "@/components/ui/walls-toast";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/toaster";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@walls/ui/skeleton";
import { PageBody } from "@/components/admin/page-shell";
import { cn } from "@/lib/utils";
import type { AppAccessRecord } from "@/lib/app-access-shared";
import type { AccountMemberRecord, AccountRole } from "@/lib/accounts-shared";
import { canManageAccountMembers } from "@/lib/accounts-shared";

function displayName(member: AccountMemberRecord): string {
  const fullName = `${member.firstName ?? ""} ${member.lastName ?? ""}`.trim();
  return fullName || member.email;
}

function AppIcon({ app, size = 20 }: { app: AppAccessRecord; size?: number }) {
  if (app.iconUrl) {
    return (
      <Image
        src={app.iconUrl}
        alt=""
        width={size}
        height={size}
        className="shrink-0 rounded object-contain"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      className="flex shrink-0 items-center justify-center rounded bg-neutral-200 text-[10px] font-medium text-neutral-600"
      style={{ width: size, height: size }}
    >
      {app.name.slice(0, 1)}
    </span>
  );
}

function MemberAvatar({
  firstName,
  lastName,
  email,
  avatarUrl,
  size = 64,
}: {
  firstName: string | null;
  lastName: string | null;
  email: string;
  avatarUrl: string | null;
  size?: number;
}) {
  const initials = `${firstName?.charAt(0) ?? ""}${lastName?.charAt(0) ?? ""}`
    .trim()
    .toUpperCase();

  if (avatarUrl) {
    return (
      <Image
        src={avatarUrl}
        alt=""
        width={size}
        height={size}
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full bg-neutral-100 text-sm font-medium text-neutral-700"
      style={{ width: size, height: size }}
    >
      {initials || email.charAt(0).toUpperCase()}
    </div>
  );
}

type AdminViewUserProps = {
  userId: string;
  organizationId: string;
  actorRole: AccountRole;
  canEdit: boolean;
};

export function AdminViewUser({
  userId,
  organizationId,
  actorRole,
  canEdit,
}: AdminViewUserProps) {
  const router = useRouter();
  const [member, setMember] = useState<AccountMemberRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [apps, setApps] = useState<AppAccessRecord[]>([]);
  const [organizationAppIds, setOrganizationAppIds] = useState<string[]>([]);
  const [memberAppIds, setMemberAppIds] = useState<string[]>([]);
  const [updatingRole, setUpdatingRole] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [togglingAppId, setTogglingAppId] = useState<string | null>(null);

  const canManage = canEdit && canManageAccountMembers(actorRole);
  const canEditMember =
    canManage && member != null && (actorRole === "owner" || member.role !== "owner");

  const catalogApps = useMemo(
    () => apps.filter((app) => organizationAppIds.includes(app.id)),
    [apps, organizationAppIds],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setNotFound(false);
    try {
      const [membersResponse, appAccessResponse] = await Promise.all([
        fetch(`/api/organizations/${organizationId}/members`, {
          cache: "no-store",
        }),
        fetch(`/api/organizations/${organizationId}/app-access`, {
          cache: "no-store",
        }),
      ]);

      if (!membersResponse.ok) {
        setNotFound(true);
        return;
      }

      const membersPayload = (await membersResponse.json()) as {
        members?: AccountMemberRecord[];
      };
      const found =
        membersPayload.members?.find((row) => row.userId === userId) ?? null;

      if (!found) {
        setNotFound(true);
        setMember(null);
        return;
      }

      setMember(found);

      if (appAccessResponse.ok) {
        const appPayload = (await appAccessResponse.json()) as {
          apps?: AppAccessRecord[];
          organizationAppIds?: string[];
          memberAppIds?: Record<string, string[]>;
        };
        setApps(appPayload.apps ?? []);
        setOrganizationAppIds(appPayload.organizationAppIds ?? []);
        setMemberAppIds(appPayload.memberAppIds?.[userId] ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [organizationId, userId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleRoleChange(role: AccountRole) {
    if (!member) return;
    setUpdatingRole(true);
    try {
      const response = await fetch(
        `/api/organizations/${organizationId}/members`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: member.userId, role }),
        },
      );

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        wallsToast.error("Error", payload.error || "Failed to update role");
        return;
      }

      setMember((prev) => (prev ? { ...prev, role } : prev));
      wallsToast.success("Role updated", "Member role was updated");
    } finally {
      setUpdatingRole(false);
    }
  }

  async function handleRemove() {
    if (!member) return;
    setRemoving(true);
    try {
      const response = await fetch(
        `/api/organizations/${organizationId}/members`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: member.userId }),
        },
      );

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        wallsToast.error("Error", payload.error || "Failed to remove member");
        return;
      }

      wallsToast.success(
        "User removed",
        "User was removed from this organization",
      );
      router.push("/users");
    } finally {
      setRemoving(false);
    }
  }

  async function handleToggleApp(appId: string, enabled: boolean) {
    if (!member || !canEditMember) return;
    setTogglingAppId(appId);
    try {
      const response = await fetch(
        `/api/organizations/${organizationId}/app-access`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            appId,
            enabled,
            userId: member.userId,
          }),
        },
      );

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        wallsToast.error(
          "Error",
          payload.error || "Failed to update app access",
        );
        return;
      }

      const payload = (await response.json()) as {
        memberAppIds?: Record<string, string[]>;
      };
      if (payload.memberAppIds) {
        setMemberAppIds(payload.memberAppIds[member.userId] ?? []);
      } else {
        setMemberAppIds((prev) =>
          enabled
            ? prev.includes(appId)
              ? prev
              : [...prev, appId]
            : prev.filter((id) => id !== appId),
        );
      }
    } finally {
      setTogglingAppId(null);
    }
  }

  if (loading) {
    return (
      <PageBody>
        <Skeleton className="h-4 w-24 rounded" />
        <div className="flex items-center gap-4">
          <Skeleton className="h-16 w-16 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-48 rounded" />
            <Skeleton className="h-4 w-56 rounded" />
          </div>
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </PageBody>
    );
  }

  if (notFound || !member) {
    return (
      <PageBody>
        <Link
          href="/users"
          className="inline-flex items-center gap-1.5 text-sm text-neutral-500 transition-colors hover:text-neutral-800"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to users
        </Link>
        <div className="rounded-xl border border-neutral-200 px-6 py-16 text-center">
          <p className="text-sm font-medium text-neutral-800">User not found</p>
          <p className="mt-1 text-sm font-light text-neutral-500">
            This person is not a member of the current organization.
          </p>
        </div>
      </PageBody>
    );
  }

  const grantedCount = catalogApps.filter((app) =>
    memberAppIds.includes(app.id),
  ).length;

  return (
    <PageBody>
      <Toaster />

      <Link
        href="/users"
        className="inline-flex items-center gap-1.5 text-sm font-light text-neutral-500 transition-colors hover:text-neutral-800"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to users
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          <MemberAvatar
            firstName={member.firstName}
            lastName={member.lastName}
            email={member.email}
            avatarUrl={member.avatarUrl}
          />
          <div className="min-w-0 space-y-1">
            <h1 className="truncate text-2xl font-medium tracking-tight text-neutral-900">
              {displayName(member)}
            </h1>
            <p className="flex items-center gap-1.5 text-sm font-light text-neutral-500">
              <Mail className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{member.email}</span>
            </p>
          </div>
        </div>

        {canEditMember ? (
          <Button
            type="button"
            variant="ghost"
            disabled={removing || updatingRole}
            onClick={() => void handleRemove()}
            className="inline-flex items-center gap-2 rounded-full text-rose-600 hover:bg-rose-50 hover:text-rose-700"
          >
            {removing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                Remove
              </>
            )}
          </Button>
        ) : null}
      </header>

      <section className="rounded-xl border border-neutral-200/80 bg-white p-6">
        <h2 className="text-base font-medium text-neutral-800">Role</h2>
        <p className="mt-1 text-sm font-light text-neutral-500">
          Their permissions in this organization
        </p>

        <div className="mt-4 max-w-xs">
          {canEditMember ? (
            <Select
              value={member.role}
              disabled={updatingRole || removing}
              onValueChange={(value) =>
                void handleRoleChange(value as AccountRole)
              }
            >
              <SelectTrigger className="h-10 rounded-lg border-neutral-200 bg-transparent font-light shadow-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                {actorRole === "owner" ? (
                  <SelectItem value="owner">Owner</SelectItem>
                ) : null}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-sm font-medium capitalize text-neutral-800">
              {member.role}
            </p>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-neutral-200/80 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-medium text-neutral-800">
              App access
            </h2>
            <p className="mt-1 text-sm font-light text-neutral-500">
              {canEditMember
                ? "Grant or revoke apps this user can use in this organization."
                : "Apps this user can use in this organization."}
            </p>
          </div>
          {catalogApps.length > 0 ? (
            <p className="text-xs font-light text-neutral-400 tabular-nums">
              {grantedCount} of {catalogApps.length}
            </p>
          ) : null}
        </div>

        <div className="mt-5 space-y-2">
          {catalogApps.length === 0 ? (
            <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50/60 px-4 py-10 text-center">
              <p className="text-sm font-medium text-neutral-800">No apps yet</p>
              <p className="mt-1 text-sm font-light text-neutral-500">
                Enable apps for this organization in Console, then assign them
                here.
              </p>
            </div>
          ) : (
            catalogApps.map((app) => {
              const enabled = memberAppIds.includes(app.id);
              const isToggling = togglingAppId === app.id;

              return (
                <button
                  key={app.id}
                  type="button"
                  disabled={
                    !canEditMember ||
                    isToggling ||
                    togglingAppId !== null ||
                    removing
                  }
                  onClick={() => {
                    if (!canEditMember) return;
                    void handleToggleApp(app.id, !enabled);
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors",
                    enabled
                      ? "border-neutral-300 bg-neutral-50"
                      : "border-neutral-200/60 bg-transparent",
                    canEditMember ? "hover:bg-neutral-50" : "cursor-default",
                    "disabled:opacity-90",
                  )}
                >
                  <AppIcon app={app} size={36} />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-neutral-800">
                    {app.name}
                  </span>
                  {isToggling ? (
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin text-neutral-400" />
                  ) : (
                    <span
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px]",
                        enabled
                          ? "border-neutral-800 bg-neutral-800 text-white"
                          : "border-neutral-200 bg-white text-transparent",
                      )}
                      aria-hidden
                    >
                      {enabled ? "✓" : ""}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>

        <p className="mt-4 text-[11px] font-light text-neutral-400">
          Members only see these apps when this organization is the active
          account in the portal.
        </p>
      </section>
    </PageBody>
  );
}
