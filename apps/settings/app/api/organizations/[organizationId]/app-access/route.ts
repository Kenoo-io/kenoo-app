import { NextResponse } from "next/server";

import {
  grantAccountAppAccess,
  listAccountAppIds,
  listManagedApps,
  listMemberAppIdsForAccount,
  revokeAccountAppAccess,
} from "@/lib/app-access";
import {
  canManageAccountMembers,
  getAccountMembershipForUser,
  listAccountMembers,
} from "@/lib/accounts";
import { canEditOrganization, getOrganizationForUser } from "@/lib/organizations";
import { getCurrentUserId } from "@/lib/session";

type RouteContext = {
  params: Promise<{ organizationId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { organizationId: accountId } = await context.params;
  const organization = await getOrganizationForUser(userId, accountId);

  if (!organization) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const members = await listAccountMembers(accountId);
    const memberUserIds = members.map((member) => member.userId);
    const [apps, organizationAppIds, memberAppIds] = await Promise.all([
      listManagedApps(),
      listAccountAppIds(accountId),
      listMemberAppIdsForAccount(accountId, memberUserIds),
    ]);

    return NextResponse.json({
      apps,
      organizationAppIds,
      memberAppIds,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load app access",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { organizationId: accountId } = await context.params;
  const organization = await getOrganizationForUser(userId, accountId);

  if (!organization || !canEditOrganization(organization.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const membership = await getAccountMembershipForUser(userId, accountId);
  if (!membership || !canManageAccountMembers(membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as {
    appId?: string;
    enabled?: boolean;
  };

  if (!body.appId || typeof body.enabled !== "boolean") {
    return NextResponse.json(
      { error: "appId and enabled are required" },
      { status: 400 },
    );
  }

  const result = body.enabled
    ? await grantAccountAppAccess({ accountId, appId: body.appId })
    : await revokeAccountAppAccess({ accountId, appId: body.appId });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const members = await listAccountMembers(accountId);
  const [apps, organizationAppIds, memberAppIds] = await Promise.all([
    listManagedApps(),
    listAccountAppIds(accountId),
    listMemberAppIdsForAccount(
      accountId,
      members.map((member) => member.userId),
    ),
  ]);

  return NextResponse.json({ apps, organizationAppIds, memberAppIds });
}
