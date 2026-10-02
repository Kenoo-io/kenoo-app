import { NextResponse } from "next/server";

import { createClient } from "@walls/supabase/server";

import { requireWorkflowsAccount } from "@/lib/api-key-auth";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

export async function GET(request: Request) {
  const auth = await requireWorkflowsAccount();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const searchParams = new URL(request.url).searchParams;
  const limit = Math.min(Math.max(Number(searchParams.get("limit")) || DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE);
  const offset = Math.max(Number(searchParams.get("offset")) || 0, 0);
  const query = searchParams.get("query")?.trim() || "";
  const supabase = await createClient();
  let foldersQuery = supabase
    .from("workflows_upload_folders")
    .select("id, parent_id, name, created_at, updated_at")
    .eq("account_id", auth.accountId);
  if (query) foldersQuery = foldersQuery.ilike("name", `%${query}%`);
  const { data, error } = await foldersQuery
    .order("name", { ascending: true })
    .range(offset, offset + limit);

  if (error) {
    console.error("[workflows] upload folders load failed", { accountId: auth.accountId, error });
    return NextResponse.json({ error: "Unable to load folders" }, { status: 500 });
  }

  return NextResponse.json({ folders: (data ?? []).slice(0, limit), hasMore: (data ?? []).length > limit });
}

export async function POST(request: Request) {
  const auth = await requireWorkflowsAccount();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const parentId = typeof body.parentId === "string" && body.parentId ? body.parentId : null;

  if (!name) return NextResponse.json({ error: "Folder name is required" }, { status: 400 });
  if (name.length > 100) return NextResponse.json({ error: "Folder name must be 100 characters or fewer" }, { status: 400 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workflows_upload_folders")
    .insert({ account_id: auth.accountId, created_by: auth.userId, parent_id: parentId, name })
    .select("id, parent_id, name, created_at, updated_at")
    .single();

  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "A folder with that name already exists here" }, { status: 409 });
    if (error.code === "23503") return NextResponse.json({ error: "Parent folder not found" }, { status: 400 });
    console.error("[workflows] upload folder creation failed", { accountId: auth.accountId, error });
    return NextResponse.json({ error: "Unable to create folder" }, { status: 500 });
  }

  return NextResponse.json({ folder: data }, { status: 201 });
}
