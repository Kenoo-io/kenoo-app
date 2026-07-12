import { NextResponse } from "next/server";

import {
  getCurrentUserId,
  listSafeConnectionsForUser,
} from "@/lib/connections-server";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const connections = await listSafeConnectionsForUser(userId);
  return NextResponse.json({ connections });
}
