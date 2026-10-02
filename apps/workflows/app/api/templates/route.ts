import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { createClient } from "@walls/supabase/server";

const ACTIVE_ACCOUNT_COOKIE = "kenoo_account_id";
const WORKFLOWS_ACCOUNT_COOKIE = "workflows_account_id";
const channels = new Set(["email", "sms", "push"]);

async function getAccountContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, userId: null, accountId: null };
  const cookieStore = await cookies();
  const accountId = cookieStore.get(ACTIVE_ACCOUNT_COOKIE)?.value ?? cookieStore.get(WORKFLOWS_ACCOUNT_COOKIE)?.value ?? null;
  if (!accountId) return { supabase, userId: user.id, accountId: null };
  const { data: membership } = await supabase.from("account_users").select("account_id").eq("user_id", user.id).eq("account_id", accountId).maybeSingle();
  return { supabase, userId: user.id, accountId: membership?.account_id ?? null };
}

export async function GET() {
  const { supabase, accountId } = await getAccountContext();
  if (!accountId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await supabase.from("workflows_templates").select("id, name, description, channel, subject, title, html_content, text_content, action_url, image_url, metadata, created_at, updated_at").eq("account_id", accountId).order("updated_at", { ascending: false });
  if (error) return NextResponse.json({ error: "Unable to load templates" }, { status: 500 });
  return NextResponse.json({ templates: data ?? [] });
}

export async function POST(request: Request) {
  const { supabase, userId, accountId } = await getAccountContext();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!accountId) return NextResponse.json({ error: "No active account" }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  let name = typeof body.name === "string" ? body.name.trim() : "";
  const channel = typeof body.channel === "string" ? body.channel.toLowerCase() : "";
  const textContent = typeof body.textContent === "string" ? body.textContent.trim() : "";
  const htmlContent = typeof body.htmlContent === "string" ? body.htmlContent.trim() : "";
  const title = typeof body.title === "string" ? body.title.trim() : null;
  if (!name) {
    const { data: existingNames, error: namesError } = await supabase
      .from("workflows_templates")
      .select("name")
      .eq("account_id", accountId)
      .like("name", "Template %");
    if (namesError) return NextResponse.json({ error: "Unable to choose a template name" }, { status: 500 });
    const taken = new Set((existingNames ?? []).map((row) => row.name));
    let number = 1;
    while (taken.has(`Template ${number}`)) number += 1;
    name = `Template ${number}`;
  }
  if (!channels.has(channel)) return NextResponse.json({ error: "Invalid template channel" }, { status: 400 });
  if (channel === "email" && !textContent && !htmlContent) return NextResponse.json({ error: "Email content is required" }, { status: 400 });
  if (channel !== "email" && !textContent) return NextResponse.json({ error: "Template message is required" }, { status: 400 });
  if (channel === "push" && !title) return NextResponse.json({ error: "Push title is required" }, { status: 400 });
  const { data, error } = await supabase.from("workflows_templates").insert({ account_id: accountId, created_by: userId, name, description: typeof body.description === "string" ? body.description.trim() || null : null, channel, subject: channel === "email" && typeof body.subject === "string" ? body.subject.trim() || null : null, html_content: channel === "email" ? htmlContent || null : null, title: channel === "push" ? title : null, text_content: textContent || null, action_url: channel === "push" && typeof body.actionUrl === "string" ? body.actionUrl.trim() || null : null, image_url: channel === "push" && typeof body.imageUrl === "string" ? body.imageUrl.trim() || null : null, metadata: body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata) ? body.metadata : {} }).select("id, name, description, channel, subject, html_content, text_content, title, action_url, image_url, metadata, created_at, updated_at").single();
  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "A template with that name already exists" }, { status: 409 });
    console.error("[workflows] template creation failed", { accountId, error });
    return NextResponse.json({ error: "Unable to save template" }, { status: 500 });
  }
  return NextResponse.json({ template: data }, { status: 201 });
}
