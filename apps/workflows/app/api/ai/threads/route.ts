import { NextResponse } from "next/server";

import { requireWorkflowsAccount } from "@/lib/api-key-auth";

const THREAD_SELECT = "id, account_id, created_by, template_id, title, status, context, created_at, updated_at";

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export async function GET() {
  const auth = await requireWorkflowsAccount();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { data, error } = await auth.supabase
    .from("workflows_ai_threads")
    .select(THREAD_SELECT)
    .eq("account_id", auth.accountId)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("[workflows] AI thread listing failed", { accountId: auth.accountId, error });
    return NextResponse.json({ error: "Unable to load AI threads" }, { status: 500 });
  }

  return NextResponse.json({ threads: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await requireWorkflowsAccount();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = (await request.json().catch(() => ({}))) as {
    title?: unknown;
    templateId?: unknown;
    context?: unknown;
  };
  const title = typeof body.title === "string" ? body.title.trim() || null : null;
  const templateId = typeof body.templateId === "string" ? body.templateId.trim() || null : null;
  const context = body.context === undefined ? {} : body.context;

  if (!isObject(context)) return NextResponse.json({ error: "context must be an object" }, { status: 400 });

  const { data, error } = await auth.supabase
    .from("workflows_ai_threads")
    .insert({
      account_id: auth.accountId,
      created_by: auth.userId,
      template_id: templateId,
      title,
      context,
    })
    .select(THREAD_SELECT)
    .single();

  if (error) {
    console.error("[workflows] AI thread creation failed", { accountId: auth.accountId, error });
    return NextResponse.json({ error: "Unable to create AI thread" }, { status: 500 });
  }

  return NextResponse.json({ thread: data }, { status: 201 });
}
