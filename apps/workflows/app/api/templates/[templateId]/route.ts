import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { ACTIVE_ACCOUNT_COOKIE } from "@walls/auth/active-account";
import { createClient } from "@walls/supabase/server";

const WORKFLOWS_ACCOUNT_COOKIE = "workflows_account_id";

async function getAccountContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, userId: null, accountId: null };
  const cookieStore = await cookies();
  const requestedAccountId = cookieStore.get(ACTIVE_ACCOUNT_COOKIE)?.value ?? cookieStore.get(WORKFLOWS_ACCOUNT_COOKIE)?.value ?? null;
  if (!requestedAccountId) return { supabase, userId: user.id, accountId: null };
  const { data: membership } = await supabase.from("account_users").select("account_id").eq("user_id", user.id).eq("account_id", requestedAccountId).maybeSingle();
  return { supabase, userId: user.id, accountId: membership?.account_id ?? null };
}

export async function GET(_request: Request, { params }: { params: Promise<{ templateId: string }> }) {
  const { supabase, userId, accountId } = await getAccountContext();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!accountId) return NextResponse.json({ error: "No active account" }, { status: 401 });
  const { templateId } = await params;
  const { data, error } = await supabase
    .from("workflows_templates")
    .select("id, name, description, channel, subject, html_content, text_content, title, action_url, image_url, metadata, created_at, updated_at")
    .eq("id", templateId)
    .eq("account_id", accountId)
    .maybeSingle();
  if (error) return NextResponse.json({ error: "Unable to load template" }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Template not found" }, { status: 404 });
  return NextResponse.json({ template: data });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ templateId: string }> }) {
  const { supabase, userId, accountId } = await getAccountContext();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!accountId) return NextResponse.json({ error: "No active account" }, { status: 401 });
  const { templateId } = await params;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (typeof body.name === "string" && body.name.trim()) update.name = body.name.trim();
  if (typeof body.description === "string") update.description = body.description.trim() || null;
  if (typeof body.subject === "string") update.subject = body.subject.trim() || null;
  if (typeof body.title === "string") update.title = body.title.trim() || null;
  if (typeof body.textContent === "string") update.text_content = body.textContent || null;
  if (typeof body.htmlContent === "string") update.html_content = body.htmlContent || null;
  if (typeof body.actionUrl === "string") update.action_url = body.actionUrl.trim() || null;
  if (typeof body.imageUrl === "string") update.image_url = body.imageUrl.trim() || null;
  if (body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)) update.metadata = body.metadata;

  const { data, error } = await supabase
    .from("workflows_templates")
    .update(update)
    .eq("id", templateId)
    .eq("account_id", accountId)
    .select("id, name, description, channel, subject, html_content, text_content, title, action_url, image_url, metadata, created_at, updated_at")
    .maybeSingle();
  if (error) {
    console.error("[workflows] template autosave failed", { accountId, templateId, error });
    return NextResponse.json({ error: "Unable to autosave template" }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "Template not found" }, { status: 404 });
  return NextResponse.json({ template: data });
}
