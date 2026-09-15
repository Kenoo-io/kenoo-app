import { NextResponse } from "next/server";

import {
  getAccountMembership,
  getCurrentUserId,
  resolveActiveAccountId,
} from "@/lib/account-context";
import {
  getSafeGitHubConnectionForAccount,
  setGitHubInstallationConnectionActive,
} from "@/lib/github-connections-server";
import { uninstallGitHubAppInstallation } from "@/lib/github-app";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accountId = await resolveActiveAccountId(userId);
  if (!accountId) {
    return NextResponse.json({ error: "No active account" }, { status: 400 });
  }

  const connection = await getSafeGitHubConnectionForAccount(accountId);
  return NextResponse.json({ connection });
}

export async function DELETE() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accountId = await resolveActiveAccountId(userId);
  if (!accountId) {
    return NextResponse.json({ error: "No active account" }, { status: 400 });
  }

  const membership = await getAccountMembership(userId, accountId);
  if (!membership || !["owner", "admin"].includes(membership.role.toLowerCase())) {
    return NextResponse.json(
      { error: "Only workspace owners and admins can disconnect GitHub" },
      { status: 403 },
    );
  }

  const connection = await getSafeGitHubConnectionForAccount(accountId);
  const installationId = connection?.provider_account_id;
  if (!installationId) {
    return NextResponse.json({ error: "No active GitHub connection" }, { status: 404 });
  }

  try {
    await uninstallGitHubAppInstallation(installationId);
    await setGitHubInstallationConnectionActive({
      installationId,
      active: false,
    });
    return NextResponse.json({ disconnected: true });
  } catch (error) {
    console.error("[projects] disconnect GitHub:", error);
    return NextResponse.json(
      { error: "Unable to disconnect GitHub" },
      { status: 500 },
    );
  }
}
