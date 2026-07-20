import { NextResponse } from "next/server";

import {
  grantAccountUserAppAccess,
  listAccountAppIds,
  listAccountUserAppIds,
  listManagedApps,
  revokeAccountUserAppAccess,
} from "@/lib/app-access";
import {
  canManageAccountMembers,
  getAccountMembershipForUser,
} from "@/lib/accounts";
import { canEditOrganization, getOrganizationForUser } from "@/lib/organizations";
import { getCurrentUserId } from "@/lib/session";

type RouteContext = {
  params: Promise<{ organizationId: string; userId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const actorUserId = await getCurrentUserId();
  if (!actorUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { organizationId: accountId, userId: targetUserId } =
    await context.params;
  const organization = await getOrganizationForUser(actorUserId, accountId);

  if (!organization) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const targetMembership = await getAccountMembershipForUser(
    targetUserId,
    accountId,
  );
  if (!targetMembership) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const [apps, organizationAppIds, memberAppIds] = await Promise.all([
      listManagedApps(),
      listAccountAppIds(accountId),
      listAccountUserAppIds({ accountId, userId: targetUserId }),
    ]);

    return NextResponse.json({ apps, organizationAppIds, memberAppIds });
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
  const actorUserId = await getCurrentUserId();
  if (!actorUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { organizationId: accountId, userId: targetUserId } =
    await context.params;
  const organization = await getOrganizationForUser(actorUserId, accountId);

  if (!organization || !canEditOrganization(organization.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const actorMembership = await getAccountMembershipForUser(
    actorUserId,
    accountId,
  );
  const targetMembership = await getAccountMembershipForUser(
    targetUserId,
    accountId,
  );

  if (
    !actorMembership ||
    !targetMembership ||
    !canManageAccountMembers(actorMembership.role)
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (actorMembership.role !== "owner" && targetMembership.role === "owner") {
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
    ? await grantAccountUserAppAccess({
        accountId,
        userId: targetUserId,
        appId: body.appId,
      })
    : await revokeAccountUserAppAccess({
        accountId,
        userId: targetUserId,
        appId: body.appId,
      });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const [apps, organizationAppIds, memberAppIds] = await Promise.all([
    listManagedApps(),
    listAccountAppIds(accountId),
    listAccountUserAppIds({ accountId, userId: targetUserId }),
  ]);

  return NextResponse.json({ apps, organizationAppIds, memberAppIds });
}
