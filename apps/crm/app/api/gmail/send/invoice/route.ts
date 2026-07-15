import { NextResponse } from "next/server";
import { google } from "googleapis";
import { createClient } from "@/lib/supabase/server";
import { prepareEmailRequest } from "@/utils/composition-formatting";

const INVOICE_SENDER_ALIAS = "ar@wallsentertainment.com";
const INVOICE_SENDER_NAME = "Accounts Receivable";
const INVOICE_CONNECTION_ID = "376f3619-c8be-484a-9dc2-a8c9e9678878";

type InvoiceSendRequest = {
  to?: string;
  vendorEmail?: string;
  cc?: string;
  bcc?: string;
  subject?: string;
  message?: string;
  invoiceNumber?: string;
  dueDate?: string;
  amount?: number | string;
  currency?: string;
  companyName?: string;
  /** When set, `invoices.status` is set to `sent` after the email sends successfully. */
  invoiceId?: string;
  /** Optional guard so the update only applies to this deal’s invoice row. */
  dealId?: string;
  threadId?: string;
  headers?: Record<string, string>;
  attachments?: { name: string; type: string; data: number[] }[];
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatAmount(value: number | string | undefined, currency: string): string {
  if (value == null || value === "") return "";
  const parsed = typeof value === "number" ? value : Number.parseFloat(String(value));
  if (!Number.isFinite(parsed)) return "";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(parsed);
}

// Block spans keep spacing after `transformToGmailFormat` strips `<p>` margins (see email composer `normalizeEmailHtmlForSend`).
const INVOICE_EMAIL_BLOCK_STYLE =
  "display:block;margin:0 0 0.75em 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.43;color:#222;";

function invoiceEmailBlock(innerHtml: string): string {
  return `<span style="${INVOICE_EMAIL_BLOCK_STYLE}">${innerHtml}</span>`;
}

function buildInvoiceEmailHtml(payload: InvoiceSendRequest, invoiceLink?: string): string {
  const company = (payload.companyName ?? "").trim() || "there";
  const invoiceNumber = (payload.invoiceNumber ?? "").trim();
  const dueDate = (payload.dueDate ?? "").trim();
  const currency = (payload.currency ?? "USD").trim().toUpperCase() || "USD";
  const amount = formatAmount(payload.amount, currency);

  const details: string[] = [];
  if (invoiceNumber) details.push(`<strong>Invoice #:</strong> ${escapeHtml(invoiceNumber)}`);
  if (amount) details.push(`<strong>Total:</strong> ${escapeHtml(amount)}`);
  if (dueDate) details.push(`<strong>Due date:</strong> ${escapeHtml(dueDate)}`);

  const viewLinkHtml = invoiceLink
    ? invoiceEmailBlock(
        `For your convenience, you may review or download a secure copy of this invoice online: <a href="${escapeHtml(invoiceLink)}" target="_blank" rel="noopener noreferrer" style="color:#2563eb;text-decoration:underline;">View invoice online</a>.`
      )
    : "";

  const blocks = [
    invoiceEmailBlock(`Hi ${escapeHtml(company)},`),
    invoiceEmailBlock("Thanks so much for your work with us."),
    invoiceEmailBlock("Please find your invoice attached for your records."),
    ...(details.length ? [invoiceEmailBlock(details.join("<br />"))] : []),
    ...(viewLinkHtml ? [viewLinkHtml] : []),
    invoiceEmailBlock("Thanks again,<br />Sarah"),
  ];

  return blocks.join("");
}

async function getInvoiceGmailClient() {
  const supabase = await createClient();
  const { data: connectionData, error: connectionError } = await supabase
    .from("user_connections")
    .select("refresh_token")
    .eq("id", INVOICE_CONNECTION_ID)
    .eq("provider", "google")
    .eq("service", "gmail")
    .is("revoked_at", null)
    .single();

  if (connectionError || !connectionData?.refresh_token) {
    throw new Error("Invoice Gmail connection not found");
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/gmail/callback`
  );
  oauth2Client.setCredentials({ refresh_token: connectionData.refresh_token });
  return google.gmail({ version: "v1", auth: oauth2Client });
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: senderProfile, error: profileError } = await supabase
      .from("users")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("Invoice send: could not load sender profile:", profileError);
      return NextResponse.json({ error: "Could not verify permissions" }, { status: 500 });
    }
    if (senderProfile?.is_admin !== true) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const payload = (await req.json()) as InvoiceSendRequest;
    const to = (payload.to ?? "").trim() || (payload.vendorEmail ?? "").trim();
    if (!to) {
      return NextResponse.json(
        { error: "Missing recipient email (provide `to` or `vendorEmail`)" },
        { status: 400 }
      );
    }

    let invoiceLink: string | undefined;
    const invoiceIdForLink = (payload.invoiceId ?? "").trim();
    if (invoiceIdForLink) {
      const { data: inv } = await supabase
        .from("invoices")
        .select("public_token")
        .eq("id", invoiceIdForLink)
        .maybeSingle();
      const token = inv?.public_token;
      if (token) {
        const base = (process.env.NEXT_PUBLIC_BASE_URL ?? "").replace(/\/$/, "");
        invoiceLink = `${base}/invoice/${token}`;
      }
    }

    const htmlMessage =
      (payload.message ?? "").trim() || buildInvoiceEmailHtml(payload, invoiceLink);
    const subject =
      (payload.subject ?? "").trim() ||
      `Invoice${payload.invoiceNumber ? ` ${payload.invoiceNumber}` : ""} from WALLS Entertainment`;

    const gmail = await getInvoiceGmailClient();
    const requestBody = prepareEmailRequest({
      to,
      cc: payload.cc,
      bcc: payload.bcc,
      subject,
      message: htmlMessage,
      formattedFromName: INVOICE_SENDER_NAME,
      userEmail: INVOICE_SENDER_ALIAS,
      headers: payload.headers,
      attachments: payload.attachments,
      threadId: payload.threadId,
    });

    await gmail.users.messages.send({
      userId: "me",
      requestBody,
    });

    let invoiceStatusUpdated = false;
    const invoiceId = (payload.invoiceId ?? "").trim();
    if (invoiceId) {
      let updateQuery = supabase.from("invoices").update({ status: "sent" }).eq("id", invoiceId);
      const dealId = (payload.dealId ?? "").trim();
      if (dealId) {
        updateQuery = updateQuery.eq("deal_id", dealId);
      }
      const { data: updatedRows, error: statusErr } = await updateQuery.select("id");
      if (statusErr) {
        console.error("Invoice send: could not set status to sent:", statusErr);
      } else if (Array.isArray(updatedRows) && updatedRows.length > 0) {
        invoiceStatusUpdated = true;
      }
    }

    return NextResponse.json({ success: true, invoiceStatusUpdated });
  } catch (error: any) {
    console.error("Error sending invoice email:", error);
    return NextResponse.json(
      { error: "Failed to send invoice email", details: error?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
