import { NextResponse } from "next/server";

import { requireWorkflowsAccount } from "@/lib/api-key-auth";

const MESSAGE_SELECT = "id, thread_id, account_id, role, content, parts, model, provider, status, metadata, error_message, created_at";
const roles = new Set(["system", "user", "assistant", "tool"]);
const statuses = new Set(["pending", "streaming", "completed", "failed"]);

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export async function GET(_request: Request, { params }: { params: Promise<{ threadId: string }> }) {
  const auth = await requireWorkflowsAccount();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { threadId } = await params;
  const { data, error } = await auth.supabase
    .from("workflows_ai_messages")
    .select(MESSAGE_SELECT)
    .eq("thread_id", threadId)
    .eq("account_id", auth.accountId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[workflows] AI message listing failed", { accountId: auth.accountId, threadId, error });
    return NextResponse.json({ error: "Unable to load AI messages" }, { status: 500 });
  }

  return NextResponse.json({ messages: data ?? [] });
}

export async function POST(request: Request, { params }: { params: Promise<{ threadId: string }> }) {
  const auth = await requireWorkflowsAccount();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { threadId } = await params;
  const body = (await request.json().catch(() => ({}))) as {
    role?: unknown;
    content?: unknown;
    parts?: unknown;
    model?: unknown;
    provider?: unknown;
    status?: unknown;
    metadata?: unknown;
  };
  if (typeof body.role !== "string" || !roles.has(body.role)) return NextResponse.json({ error: "Invalid message role" }, { status: 400 });
  if (body.content !== undefined && body.content !== null && typeof body.content !== "string") return NextResponse.json({ error: "content must be a string" }, { status: 400 });
  if (body.parts !== undefined && (!Array.isArray(body.parts))) return NextResponse.json({ error: "parts must be an array" }, { status: 400 });
  if (body.content == null && (!Array.isArray(body.parts) || body.parts.length === 0)) return NextResponse.json({ error: "Message content or parts are required" }, { status: 400 });
  if (body.status !== undefined && (typeof body.status !== "string" || !statuses.has(body.status))) return NextResponse.json({ error: "Invalid message status" }, { status: 400 });
  if (body.metadata !== undefined && !isObject(body.metadata)) return NextResponse.json({ error: "metadata must be an object" }, { status: 400 });

  const { data, error } = await auth.supabase
    .from("workflows_ai_messages")
    .insert({
      thread_id: threadId,
      account_id: auth.accountId,
      role: body.role,
      content: typeof body.content === "string" ? body.content : null,
      parts: Array.isArray(body.parts) ? body.parts : [],
      model: typeof body.model === "string" ? body.model.trim() || null : null,
      provider: typeof body.provider === "string" ? body.provider.trim() || null : null,
      status: typeof body.status === "string" ? body.status : "completed",
      metadata: isObject(body.metadata) ? body.metadata : {},
    })
    .select(MESSAGE_SELECT)
    .single();

  if (error) {
    if (error.code === "23503") return NextResponse.json({ error: "AI thread not found" }, { status: 404 });
    console.error("[workflows] AI message creation failed", { accountId: auth.accountId, threadId, error });
    return NextResponse.json({ error: "Unable to save AI message" }, { status: 500 });
  }

  await auth.supabase
    .from("workflows_ai_threads")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", threadId)
    .eq("account_id", auth.accountId);

  return NextResponse.json({ message: data }, { status: 201 });
}
