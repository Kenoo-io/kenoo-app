"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronDown,
  Loader2,
  MoreVertical,
  Plus,
  Search,
  X,
} from "lucide-react";

import { wallsToast } from "@/components/ui/walls-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@walls/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@walls/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { AppAccessRecord } from "@/lib/app-access-shared";
import type { AccountMemberRecord, AccountRole } from "@/lib/accounts-shared";
import { canManageAccountMembers } from "@/lib/accounts-shared";

const inviteFieldClass =
  "w-full rounded-none border-0 border-b border-neutral-200 bg-transparent px-0 py-2 text-sm font-light text-neutral-800 shadow-none placeholder:text-neutral-300 focus-visible:border-b-[var(--kenoo-sky)] focus-visible:outline-none focus-visible:ring-0";

function roleMeta(role: AccountRole): {
  label: string;
  dotClass: string;
} {
  switch (role) {
    case "owner":
      return { label: "Owner", dotClass: "bg-kenoo-yellow" };
    case "admin":
      return { label: "Admin", dotClass: "bg-[var(--kenoo-sky)]" };
    case "member":
    default:
      return { label: "Member", dotClass: "bg-neutral-300" };
  }
}

function MemberAvatar({
  firstName,
  lastName,
  email,
  avatarUrl,
}: {
  firstName: string | null;
  lastName: string | null;
  email: string;
  avatarUrl: string | null;
}) {
  const initials = `${firstName?.charAt(0) ?? ""}${lastName?.charAt(0) ?? ""}`
    .trim()
    .toUpperCase();

  if (avatarUrl) {
    return (
      <Image
        src={avatarUrl}
        alt=""
        width={32}
        height={32}
        className="h-8 w-8 shrink-0 rounded-full object-cover"
      />
    );
  }

  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-[11px] font-medium text-neutral-700">
      {initials || email.charAt(0).toUpperCase()}
    </div>
  );
}

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

type OrganizationMembersProps = {
  organizationId: string;
  actorRole: AccountRole;
  canEdit: boolean;
  initialShowInvite?: boolean;
};

export function OrganizationMembers({
  organizationId,
  actorRole,
  canEdit,
  initialShowInvite = false,
}: OrganizationMembersProps) {
  const router = useRouter();
  const [members, setMembers] = useState<AccountMemberRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showInviteForm, setShowInviteForm] = useState(initialShowInvite);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteFirstName, setInviteFirstName] = useState("");
  const [inviteLastName, setInviteLastName] = useState("");
  const [inviteRole, setInviteRole] = useState<AccountRole>("member");
  const [inviteAppIds, setInviteAppIds] = useState<string[]>([]);
  const [inviting, setInviting] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const [inviteDialogEl, setInviteDialogEl] = useState<HTMLDivElement | null>(
    null,
  );

  const [apps, setApps] = useState<AppAccessRecord[]>([]);
  const [organizationAppIds, setOrganizationAppIds] = useState<string[]>([]);

  const canManage = canEdit && canManageAccountMembers(actorRole);

  const catalogApps = useMemo(
    () => apps.filter((app) => organizationAppIds.includes(app.id)),
    [apps, organizationAppIds],
  );

  const selectedInviteApps = useMemo(
    () => catalogApps.filter((app) => inviteAppIds.includes(app.id)),
    [catalogApps, inviteAppIds],
  );

  const inviteAppsLabel =
    selectedInviteApps.length === 0
      ? "Select apps…"
      : selectedInviteApps.length <= 2
        ? selectedInviteApps.map((app) => app.name).join(", ")
        : `${selectedInviteApps.length} apps selected`;

  const resetInviteForm = () => {
    setInviteEmail("");
    setInviteFirstName("");
    setInviteLastName("");
    setInviteRole("member");
    setInviteAppIds([]);
    setShowInviteForm(false);
  };

  const loadAppAccess = useCallback(async () => {
    const response = await fetch(
      `/api/organizations/${organizationId}/app-access`,
      { cache: "no-store" },
    );
    if (!response.ok) return;

    const payload = (await response.json()) as {
      apps?: AppAccessRecord[];
      organizationAppIds?: string[];
    };
    setApps(payload.apps ?? []);
    setOrganizationAppIds(payload.organizationAppIds ?? []);
  }, [organizationId]);

  const loadMembers = useCallback(async () => {
    setLoading(true);
    try {
      const [membersResponse] = await Promise.all([
        fetch(`/api/organizations/${organizationId}/members`, {
          cache: "no-store",
        }),
        loadAppAccess(),
      ]);
      if (!membersResponse.ok) return;

      const payload = (await membersResponse.json()) as {
        members?: AccountMemberRecord[];
      };
      setMembers(payload.members ?? []);
    } finally {
      setLoading(false);
    }
  }, [organizationId, loadAppAccess]);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  useEffect(() => {
    if (initialShowInvite && canManage) {
      setShowInviteForm(true);
    }
  }, [initialShowInvite, canManage]);

  function toggleInviteApp(appId: string) {
    setInviteAppIds((prev) =>
      prev.includes(appId)
        ? prev.filter((id) => id !== appId)
        : [...prev, appId],
    );
  }

  async function handleInvite() {
    if (!inviteEmail.trim()) {
      wallsToast.error("Missing email", "Enter an email to add a user");
      return;
    }

    setInviting(true);
    try {
      const response = await fetch(
        `/api/organizations/${organizationId}/members`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: inviteEmail.trim(),
            role: inviteRole,
            appIds: inviteAppIds,
            ...(inviteFirstName.trim()
              ? { firstName: inviteFirstName.trim() }
              : {}),
            ...(inviteLastName.trim()
              ? { lastName: inviteLastName.trim() }
              : {}),
          }),
        },
      );

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        wallsToast.error("Error", payload.error || "Failed to create user");
        return;
      }

      const payload = (await response.json()) as {
        members?: AccountMemberRecord[];
        invited?: boolean;
        created?: boolean;
        emailSent?: boolean;
        emailError?: string;
      };
      setMembers(payload.members ?? []);
      resetInviteForm();

      if (payload.emailSent) {
        wallsToast.success(
          "User added",
          payload.invited
            ? "They will get an email to create their password and join this organization"
            : "They will get an email letting them know they were added to this organization",
        );
      } else if (payload.emailSent === false) {
        wallsToast.success(
          "User added",
          payload.emailError
            ? `Added to the organization, but the email failed: ${payload.emailError}`
            : "Added to the organization, but the notification email could not be sent",
        );
      } else {
        wallsToast.success(
          "User added",
          "Existing user was added to this organization",
        );
      }
    } finally {
      setInviting(false);
    }
  }

  async function handleRoleChange(userId: string, role: AccountRole) {
    setUpdatingUserId(userId);
    try {
      const response = await fetch(
        `/api/organizations/${organizationId}/members`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, role }),
        },
      );

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        wallsToast.error("Error", payload.error || "Failed to update role");
        return;
      }

      const payload = (await response.json()) as {
        members?: AccountMemberRecord[];
      };
      setMembers(payload.members ?? []);
      wallsToast.success("Role updated", "Member role was updated");
    } finally {
      setUpdatingUserId(null);
    }
  }

  async function handleRemove(userId: string) {
    setRemovingUserId(userId);
    try {
      const response = await fetch(
        `/api/organizations/${organizationId}/members`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        },
      );

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        wallsToast.error("Error", payload.error || "Failed to remove member");
        return;
      }

      const payload = (await response.json()) as {
        members?: AccountMemberRecord[];
      };
      setMembers(payload.members ?? []);
      wallsToast.success(
        "User removed",
        "User was removed from this organization",
      );
    } finally {
      setRemovingUserId(null);
    }
  }

  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter((member) => {
      const name = displayName(member).toLowerCase();
      return name.includes(q) || member.email.toLowerCase().includes(q);
    });
  }, [members, search]);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-10 w-64 rounded-lg" />
          <Skeleton className="h-10 w-36 rounded-full" />
        </div>
        <Skeleton className="h-72 w-full rounded-none" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name or email…"
            aria-label="Search users"
            className="h-9 w-full rounded-lg bg-kenoo-white pl-9 pr-3 text-sm outline-none ring-1 ring-black/[0.06] placeholder:text-neutral-400"
          />
        </div>

        <p className="text-xs font-medium tabular-nums text-neutral-400">
          {filteredMembers.length}{" "}
          {filteredMembers.length === 1 ? "user" : "users"}
        </p>

        {canManage ? (
          <Button
            type="button"
            onClick={() => setShowInviteForm(true)}
            className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-lg bg-neutral-950 px-3.5 text-sm font-medium text-white hover:bg-neutral-800"
          >
            <Plus className="h-4 w-4" />
            Add user
          </Button>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-xl border border-neutral-200">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] table-fixed text-sm">
          <thead className="border-b border-neutral-100">
            <tr>
              <th className="w-[32%] py-3 pl-5 pr-4 text-left text-xs font-medium uppercase tracking-wide text-neutral-400">
                Name
              </th>
              <th className="w-[34%] py-3 pl-3 pr-4 text-left text-xs font-medium uppercase tracking-wide text-neutral-400">
                Email
              </th>
              <th className="w-[18%] py-3 pl-3 pr-4 text-left text-xs font-medium uppercase tracking-wide text-neutral-400">
                Role
              </th>
              <th className="w-[16%] py-3 pl-3 pr-5 text-right text-xs font-medium uppercase tracking-wide text-neutral-400">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredMembers.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="py-16 text-center text-sm font-light text-neutral-400"
                >
                  {members.length === 0
                    ? "No users yet. Add a user to get started."
                    : "No users match your search."}
                </td>
              </tr>
            ) : (
              filteredMembers.map((member) => {
                const meta = roleMeta(member.role);
                const isUpdating = updatingUserId === member.userId;
                const isRemoving = removingUserId === member.userId;
                const canEditMember =
                  canManage &&
                  (actorRole === "owner" || member.role !== "owner");

                return (
                  <tr
                    key={member.id}
                    className="border-b border-neutral-50 transition-colors hover:bg-neutral-50/60"
                  >
                    <td className="overflow-hidden py-4 pl-5 pr-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <MemberAvatar
                          firstName={member.firstName}
                          lastName={member.lastName}
                          email={member.email}
                          avatarUrl={member.avatarUrl}
                        />
                        <span className="truncate text-sm font-medium text-neutral-800">
                          {displayName(member)}
                        </span>
                      </div>
                    </td>
                    <td className="overflow-hidden py-4 pl-3 pr-4 text-xs font-light text-neutral-500">
                      <span className="block truncate">{member.email}</span>
                    </td>
                    <td className="py-4 pl-3 pr-4">
                      {canEditMember ? (
                        <Select
                          value={member.role}
                          disabled={isUpdating || isRemoving}
                          onValueChange={(value) =>
                            void handleRoleChange(
                              member.userId,
                              value as AccountRole,
                            )
                          }
                        >
                          <SelectTrigger className="h-8 w-[7.5rem] rounded-lg border-neutral-200 bg-transparent px-2 text-xs font-light shadow-none disabled:opacity-50">
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
                        <span className="inline-flex items-center gap-1.5 text-xs font-light text-neutral-500">
                          <span
                            className={cn(
                              "h-2 w-2 shrink-0 rounded-full",
                              meta.dotClass,
                            )}
                            aria-hidden
                          />
                          {meta.label}
                        </span>
                      )}
                    </td>
                    <td className="py-4 pl-3 pr-5">
                      <div className="flex items-center justify-end">
                        {isRemoving ? (
                          <Loader2 className="h-4 w-4 animate-spin text-neutral-400" />
                        ) : (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                disabled={isUpdating}
                                aria-label="User actions"
                                className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 focus:outline-none focus-visible:outline-none data-[state=open]:bg-neutral-100 data-[state=open]:text-neutral-700 disabled:opacity-40"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="min-w-[9rem] rounded-[15px] border-0 bg-white/90 p-1 font-light text-foreground shadow-md backdrop-blur-xl"
                            >
                              <DropdownMenuItem
                                className="cursor-pointer rounded-[10px] px-3 py-1.5 text-sm font-light focus:bg-neutral-100"
                                onSelect={() =>
                                  router.push(`/users/${member.userId}`)
                                }
                              >
                                View user
                              </DropdownMenuItem>
                              {canEditMember ? (
                                <DropdownMenuItem
                                  className="cursor-pointer rounded-[10px] px-3 py-1.5 text-sm font-light text-rose-600 focus:bg-neutral-100 focus:text-rose-600"
                                  onSelect={() =>
                                    void handleRemove(member.userId)
                                  }
                                >
                                  Remove
                                </DropdownMenuItem>
                              ) : null}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        </div>
      </div>

      <Dialog
        open={showInviteForm}
        onOpenChange={(open) => !open && resetInviteForm()}
      >
        <DialogContent
          ref={setInviteDialogEl}
          showCloseButton={false}
          overlayClassName="z-[120] bg-kenoo-white"
          onPointerDownOutside={(event) => event.preventDefault()}
          onInteractOutside={(event) => event.preventDefault()}
          className="inset-0 left-0 top-0 z-[120] flex h-dvh max-h-none w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none border-0 bg-kenoo-white p-0 shadow-none data-[state=closed]:slide-out-to-left-0 data-[state=closed]:slide-out-to-top-0 data-[state=open]:slide-in-from-left-0 data-[state=open]:slide-in-from-top-0"
        >
          <div className="flex h-full min-h-0 flex-col">
            <header className="flex h-14 shrink-0 items-center gap-3 border-b border-neutral-200 bg-neutral-100 px-4 sm:px-6">
              <button
                type="button"
                onClick={resetInviteForm}
                aria-label="Close"
                className="rounded-lg p-1.5 text-neutral-500 transition-colors hover:bg-neutral-200/80 hover:text-neutral-900"
              >
                <X className="h-5 w-5" />
              </button>
              <h2 className="text-base font-medium tracking-tight text-neutral-900">
                Add user
              </h2>
            </header>

            <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto px-4 py-8 sm:px-6">
              <div className="mx-auto w-full max-w-2xl">
                <div className="border-b border-neutral-100 pb-4">
                  <h3 className="text-base font-medium text-neutral-800">
                    User information
                  </h3>
                  <p className="mt-1 text-sm font-light text-neutral-500">
                    They’ll get an invite email to join this organization.
                  </p>
                </div>

                <div className="mt-6 space-y-6">
                  <div className="grid gap-6 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-medium text-neutral-500">
                        First name
                      </span>
                      <Input
                        type="text"
                        value={inviteFirstName}
                        onChange={(event) =>
                          setInviteFirstName(event.target.value)
                        }
                        placeholder="Jane"
                        className={inviteFieldClass}
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-medium text-neutral-500">
                        Last name
                      </span>
                      <Input
                        type="text"
                        value={inviteLastName}
                        onChange={(event) =>
                          setInviteLastName(event.target.value)
                        }
                        placeholder="Doe"
                        className={inviteFieldClass}
                      />
                    </label>
                  </div>

                  <label className="block">
                    <span className="mb-1.5 block text-xs font-medium text-neutral-500">
                      Email <span className="text-neutral-400">*</span>
                    </span>
                    <Input
                      type="email"
                      value={inviteEmail}
                      onChange={(event) => setInviteEmail(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          void handleInvite();
                        }
                      }}
                      placeholder="user@example.com"
                      className={inviteFieldClass}
                    />
                    <span className="mt-1.5 block text-xs font-light text-neutral-400">
                      We’ll send sign-in instructions to this address.
                    </span>
                  </label>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-medium text-neutral-500">
                        Role
                      </span>
                      <Select
                        value={inviteRole}
                        onValueChange={(value) =>
                          setInviteRole(value as AccountRole)
                        }
                      >
                        <SelectTrigger className="h-10 rounded-none border-0 border-b border-neutral-200 bg-transparent px-0 font-light shadow-none focus:ring-0 data-[state=open]:border-b-[var(--kenoo-sky)]">
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
                    </label>

                    <div className="block">
                      <span className="mb-1.5 block text-xs font-medium text-neutral-500">
                        App access
                      </span>
                      {catalogApps.length === 0 ? (
                        <p className="flex h-10 items-center text-sm font-light text-neutral-400">
                          No apps available
                        </p>
                      ) : (
                        <Popover modal={false}>
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              className="flex h-10 w-full items-center justify-between border-0 border-b border-neutral-200 bg-transparent px-0 text-left text-sm font-light shadow-none outline-none transition-colors data-[state=open]:border-b-[var(--kenoo-sky)]"
                            >
                              <span
                                className={cn(
                                  "truncate",
                                  selectedInviteApps.length === 0
                                    ? "text-neutral-300"
                                    : "text-neutral-800",
                                )}
                              >
                                {inviteAppsLabel}
                              </span>
                              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent
                            container={inviteDialogEl}
                            align="start"
                            className="z-[200] pointer-events-auto w-80 rounded-[15px] border-0 bg-white/90 p-0 font-light text-foreground shadow-md backdrop-blur-xl"
                            onOpenAutoFocus={(event) => event.preventDefault()}
                            onCloseAutoFocus={(event) => event.preventDefault()}
                            onWheel={(event) => event.stopPropagation()}
                          >
                            <div className="max-h-64 overflow-y-auto overscroll-contain py-1">
                              {catalogApps.map((app) => {
                                const selected = inviteAppIds.includes(app.id);

                                return (
                                  <button
                                    key={app.id}
                                    type="button"
                                    onClick={() => toggleInviteApp(app.id)}
                                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-neutral-50"
                                  >
                                    <AppIcon app={app} size={20} />
                                    <span className="min-w-0 flex-1 truncate text-sm font-light text-neutral-800">
                                      {app.name}
                                    </span>
                                    <Check
                                      className={cn(
                                        "h-4 w-4 shrink-0 text-[var(--kenoo-sky)]",
                                        selected ? "opacity-100" : "opacity-0",
                                      )}
                                      aria-hidden
                                    />
                                  </button>
                                );
                              })}
                            </div>
                            {selectedInviteApps.length > 0 ? (
                              <div className="border-t border-neutral-100 px-3 py-2">
                                <button
                                  type="button"
                                  onClick={() => setInviteAppIds([])}
                                  className="text-xs font-medium text-neutral-500 transition-colors hover:text-neutral-800"
                                >
                                  Clear selection
                                </button>
                              </div>
                            ) : null}
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center justify-end gap-3 border-t border-neutral-100 bg-kenoo-white px-4 py-4 sm:px-6">
              <button
                type="button"
                onClick={resetInviteForm}
                className="px-3 py-2 text-sm font-medium tracking-wide text-neutral-500 transition-colors hover:text-neutral-800"
              >
                Cancel
              </button>
              <Button
                type="button"
                disabled={inviting || !inviteEmail.trim()}
                onClick={() => void handleInvite()}
                className="rounded-lg bg-neutral-950 px-5 text-white hover:bg-neutral-800 disabled:opacity-40"
              >
                {inviting ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Adding…
                  </span>
                ) : (
                  "Add user"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
