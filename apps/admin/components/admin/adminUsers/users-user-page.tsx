"use client";

import { Building2, Users } from "lucide-react";

import { AdminViewUser } from "@/components/admin/adminUsers/admin-view-user";
import { PageBody } from "@/components/admin/page-shell";
import { useActiveAccount } from "@/components/active-account-context";
import type { AccountRole } from "@/lib/accounts-shared";
import { canManageAccountMembers } from "@/lib/accounts-shared";

type UsersUserPageContentProps = {
  userId: string;
};

export function UsersUserPageContent({ userId }: UsersUserPageContentProps) {
  const { activeAccount, activeAccountId, loading } = useActiveAccount();

  if (loading) {
    return (
      <PageBody>
        <div className="h-8 w-40 animate-pulse rounded-lg bg-neutral-200/80" />
        <div className="h-64 animate-pulse rounded-xl border border-neutral-200" />
      </PageBody>
    );
  }

  if (!activeAccountId || !activeAccount) {
    return (
      <PageBody>
        <div className="rounded-xl border border-neutral-200 px-6 py-16 text-center">
          <Building2 className="mx-auto h-10 w-10 text-neutral-300" />
          <p className="mt-4 text-sm font-medium text-neutral-800">
            No account selected
          </p>
          <p className="mt-1 text-sm text-neutral-500">
            Choose a workspace from the sidebar to view this user.
          </p>
        </div>
      </PageBody>
    );
  }

  if (activeAccount.accountType !== "organization") {
    return (
      <PageBody>
        <div className="rounded-xl border border-neutral-200 px-6 py-12 text-center">
          <Users className="mx-auto h-8 w-8 text-neutral-300" />
          <p className="mt-3 text-sm font-medium text-neutral-800">
            User details are available for organizations
          </p>
          <p className="mt-1 text-sm text-neutral-500">
            Switch to an organization in the sidebar to manage members.
          </p>
        </div>
      </PageBody>
    );
  }

  const actorRole = (activeAccount.role as AccountRole) || "member";
  const canEdit = canManageAccountMembers(actorRole);

  return (
    <AdminViewUser
      userId={userId}
      organizationId={activeAccountId}
      actorRole={actorRole}
      canEdit={canEdit}
    />
  );
}
