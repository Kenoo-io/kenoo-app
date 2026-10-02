import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { NextResponse } from "next/server";

import { createClient } from "@walls/supabase/server";

const DEFAULT_FROM_EMAIL = "noreply@mail.kenoo.io";

function getSesClient(): SESClient | null {
  const region = process.env.AWS_REGION?.trim();
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY?.trim();
  if (!region || !accessKeyId || !secretAccessKey) return null;
  return new SESClient({ region, credentials: { accessKeyId, secretAccessKey } });
}

function sourceAddress() {
  const from = process.env.SES_FROM_EMAIL?.trim() || DEFAULT_FROM_EMAIL;
  return from.includes("<") ? from : `Kenoo <${from}>`;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await request.json().catch(() => ({}))) as { to?: unknown; templateName?: unknown; html?: unknown };
    const to = typeof body.to === "string" ? body.to.trim() : "";
    const templateName = typeof body.templateName === "string" ? body.templateName.trim() : "";
    const html = typeof body.html === "string" ? body.html : "";
    if (!to || !/^\S+@\S+\.\S+$/.test(to)) return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
    if (!html) return NextResponse.json({ error: "Email content is required" }, { status: 400 });

    const client = getSesClient();
    if (!client) return NextResponse.json({ error: "Email service is not configured" }, { status: 503 });
    await client.send(new SendEmailCommand({
      Source: sourceAddress(),
      Destination: { ToAddresses: [to.toLowerCase()] },
      Message: {
        Subject: { Data: `[TEST] ${templateName || "Template"}`, Charset: "UTF-8" },
        Body: { Html: { Data: html, Charset: "UTF-8" } },
      },
    }));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[workflows] SES test email failed", error);
    return NextResponse.json({ error: "Unable to send test email" }, { status: 500 });
  }
}
