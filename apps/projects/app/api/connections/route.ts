import { NextResponse } from "next/server";

import {
  getCurrentUserId,
  resolveActiveAccountId,
} from "@/lib/account-context";
import { getSafeGitHubConnectionForAccount } from "@/lib/github-connections-server";

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
