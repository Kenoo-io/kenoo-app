"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Building2, Users } from "lucide-react";

import { OrganizationMembers } from "@/components/admin/adminOrganizations/organization-members";
import { PageShell } from "@/components/admin/page-shell";
import { useActiveAccount } from "@/components/active-account-context";
import type { AccountRole } from "@/lib/accounts-shared";
import { canManageAccountMembers } from "@/lib/accounts-shared";
import { Toaster } from "@/components/ui/toaster";

function UsersPageContent() {
  const searchParams = useSearchParams();
  const { activeAccount, activeAccountId, loading } = useActiveAccount();
  const showInvite = searchParams.get("invite") === "1";

  if (loading) {
    return (
      <PageShell title="Users">
        <div className="h-72 animate-pulse rounded-xl border border-neutral-200" />
      </PageShell>
    );
  }

  if (!activeAccountId || !activeAccount) {
    return (
      <PageShell title="Users">
        <div className="rounded-xl border border-neutral-200 px-6 py-16 text-center">
          <Building2 className="mx-auto h-10 w-10 text-neutral-300" />
          <p className="mt-4 text-sm font-medium text-neutral-900">
            No account selected
          </p>
          <p className="mt-1 text-sm text-neutral-500">
            Choose a workspace from the sidebar to manage users.
          </p>
        </div>
      </PageShell>
    );
  }

  const actorRole = (activeAccount.role as AccountRole) || "member";
  const canEdit = canManageAccountMembers(actorRole);
  const isOrganization = activeAccount.accountType === "organization";

  return (
    <PageShell
      title="Users"
      description="Invite members and manage roles for this workspace."
    >
      <Toaster />

      {!isOrganization ? (
        <div className="rounded-xl border border-neutral-200 px-6 py-12 text-center">
          <Users className="mx-auto h-8 w-8 text-neutral-300" />
          <p className="mt-3 text-sm font-medium text-neutral-900">
            User directory is available for organizations
          </p>
          <p className="mt-1 text-sm text-neutral-500">
            Switch to an organization in the sidebar to manage members.
          </p>
        </div>
      ) : (
        <OrganizationMembers
          organizationId={activeAccountId}
          actorRole={actorRole}
          canEdit={canEdit}
          initialShowInvite={showInvite}
        />
      )}
    </PageShell>
  );
}

export function AdminUsersPage() {
  return (
    <Suspense
      fallback={
        <PageShell title="Users">
          <div className="h-72 animate-pulse rounded-xl border border-neutral-200" />
        </PageShell>
      }
    >
      <UsersPageContent />
    </Suspense>
  );
}
