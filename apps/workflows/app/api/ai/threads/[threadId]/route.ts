import { NextResponse } from "next/server";

import { requireWorkflowsAccount } from "@/lib/api-key-auth";

const THREAD_SELECT = "id, account_id, created_by, template_id, title, status, context, created_at, updated_at";

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export async function GET(_request: Request, { params }: { params: Promise<{ threadId: string }> }) {
  const auth = await requireWorkflowsAccount();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { threadId } = await params;
  const { data, error } = await auth.supabase
    .from("workflows_ai_threads")
    .select(THREAD_SELECT)
    .eq("id", threadId)
    .eq("account_id", auth.accountId)
    .maybeSingle();

  if (error) {
    console.error("[workflows] AI thread load failed", { accountId: auth.accountId, threadId, error });
    return NextResponse.json({ error: "Unable to load AI thread" }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "AI thread not found" }, { status: 404 });

  return NextResponse.json({ thread: data });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ threadId: string }> }) {
  const auth = await requireWorkflowsAccount();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { threadId } = await params;
  const body = (await request.json().catch(() => ({}))) as {
    title?: unknown;
    status?: unknown;
    context?: unknown;
  };
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (body.title !== undefined) {
    if (typeof body.title !== "string") return NextResponse.json({ error: "title must be a string" }, { status: 400 });
    update.title = body.title.trim() || null;
  }
  if (body.status !== undefined) {
    if (body.status !== "active" && body.status !== "archived") return NextResponse.json({ error: "Invalid thread status" }, { status: 400 });
    update.status = body.status;
  }
  if (body.context !== undefined) {
    if (!isObject(body.context)) return NextResponse.json({ error: "context must be an object" }, { status: 400 });
    update.context = body.context;
  }

  const { data, error } = await auth.supabase
    .from("workflows_ai_threads")
    .update(update)
    .eq("id", threadId)
    .eq("account_id", auth.accountId)
    .select(THREAD_SELECT)
    .maybeSingle();

  if (error) {
    console.error("[workflows] AI thread update failed", { accountId: auth.accountId, threadId, error });
    return NextResponse.json({ error: "Unable to update AI thread" }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "AI thread not found" }, { status: 404 });

  return NextResponse.json({ thread: data });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ threadId: string }> }) {
  const auth = await requireWorkflowsAccount();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { threadId } = await params;
  const { data, error } = await auth.supabase
    .from("workflows_ai_threads")
    .delete()
    .eq("id", threadId)
    .eq("account_id", auth.accountId)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[workflows] AI thread deletion failed", { accountId: auth.accountId, threadId, error });
    return NextResponse.json({ error: "Unable to delete AI thread" }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "AI thread not found" }, { status: 404 });

  return NextResponse.json({ ok: true, threadId: data.id });
}
