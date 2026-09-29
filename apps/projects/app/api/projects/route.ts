import { NextResponse } from "next/server";

import { createClient } from "@walls/supabase/server";
import {
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

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .insert(payload)
    .select("id")
    .single();

  if (error) {
    console.error("[projects] create project:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ id: data.id, accountId });
}
