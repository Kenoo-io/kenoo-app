import { NextResponse } from "next/server";

import { createAdminClient } from "@walls/supabase/admin";
import {
  getAccountMembership,
  getCurrentUserId,
  resolveActiveAccountId,
} from "@/lib/account-context";

const PROJECT_FIELDS = [
  "name",
  "description",
  "status",
  "start_date",
  "due_date",
  "priority",
  "color",
  "slug",
] as const;

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accountId = await resolveActiveAccountId(userId);
  if (!accountId) {
    return NextResponse.json(
      { error: "No active account is available for Projects" },
      { status: 400 },
    );
  }

  const membership = await getAccountMembership(userId, accountId);
  if (!membership) {
    return NextResponse.json({ error: "You are not a member of this account" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  if (!body || typeof body.name !== "string" || !body.name.trim()) {
    return NextResponse.json({ error: "Project name is required" }, { status: 400 });
  }

  const payload = Object.fromEntries(
    PROJECT_FIELDS.filter((field) => field in body).map((field) => [field, body[field]]),
  );
  payload.name = body.name.trim();
  payload.account_id = accountId;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("projects")
    .insert(payload)
    .select("id")
    .single();

  if (error) {
    console.error("[projects] create project:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const { error: ownerError } = await admin.from("project_members").upsert(
    { project_id: data.id, user_id: userId, role: "owner" },
    { onConflict: "project_id,user_id" },
  );
  if (ownerError) {
    await admin.from("projects").delete().eq("id", data.id);
    console.error("[projects] create project owner:", ownerError);
    return NextResponse.json({ error: ownerError.message }, { status: 500 });
  }

  return NextResponse.json({ id: data.id, accountId });
}
