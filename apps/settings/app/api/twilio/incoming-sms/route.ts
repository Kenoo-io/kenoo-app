import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";

import { createAdminClient } from "@walls/supabase/admin";
import {
  KENOO_SMS_CONSENT_VERSION,
  KENOO_SMS_HELP_REPLY,
  normalizePhoneDigits,
} from "@walls/utils";

export const runtime = "nodejs";

function twimlMessage(body: string) {
  const escaped = body
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escaped}</Message></Response>`;
}

function emptyTwiml() {
  return `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;
}

function validateTwilioSignature(input: {
  authToken: string;
  signature: string | null;
  url: string;
  params: Record<string, string>;
}): boolean {
  if (!input.signature) return false;

  const data = Object.keys(input.params)
    .sort()
    .reduce((acc, key) => acc + key + input.params[key], input.url);

  const expected = createHmac("sha1", input.authToken)
    .update(Buffer.from(data, "utf-8"))
    .digest("base64");

  try {
    const left = Buffer.from(expected);
    const right = Buffer.from(input.signature);
    if (left.length !== right.length) return false;
    return timingSafeEqual(left, right);
  } catch {
    return false;
  }
}

async function findUsersByPhone(fromRaw: string) {
  const supabase = createAdminClient();
  const fromDigits = normalizePhoneDigits(fromRaw);
  if (!fromDigits) return [] as Array<{ id: string; phone_number: string | null }>;

  const last10 =
    fromDigits.length > 10 ? fromDigits.slice(-10) : fromDigits;

  const { data, error } = await supabase
    .from("users")
    .select("id, phone_number, sms_consent_phone")
    .or(
      `phone_number.ilike.%${last10}%,sms_consent_phone.ilike.%${last10}%`,
    )
    .limit(50);

  if (error) throw error;

  return (data ?? []).filter((row) => {
    const phoneDigits = normalizePhoneDigits(row.phone_number);
    const consentDigits = normalizePhoneDigits(row.sms_consent_phone);
    return (
      phoneDigits === fromDigits ||
      consentDigits === fromDigits ||
      (phoneDigits.length >= 10 &&
        fromDigits.length >= 10 &&
        (phoneDigits.endsWith(last10) || fromDigits.endsWith(phoneDigits.slice(-10)))) ||
      (consentDigits.length >= 10 &&
        fromDigits.length >= 10 &&
        (consentDigits.endsWith(last10) || fromDigits.endsWith(consentDigits.slice(-10))))
    );
  });
}

async function optOutUsers(
  users: Array<{ id: string; phone_number: string | null }>,
  fromRaw: string,
) {
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  for (const user of users) {
    await supabase
      .from("users")
      .update({
        sms_notifications_enabled: false,
        sms_consent_withdrawn_at: now,
        sms_consent_source: "sms_stop",
      })
      .eq("id", user.id);

    await supabase.from("sms_consent_events").insert({
      user_id: user.id,
      phone_number: fromRaw || user.phone_number,
      action: "opt_out",
      consent_version: KENOO_SMS_CONSENT_VERSION,
      source: "sms_stop",
      metadata: { inbound: true },
    });

    await supabase
      .from("alert_subscriptions")
      .update({
        notify_sms: false,
        updated_at: now,
      })
      .eq("user_id", user.id)
      .eq("notify_sms", true);
  }
}

/**
 * Twilio Messaging inbound webhook.
 * Configure this URL on the Messaging Service / phone number:
 *   POST {NEXT_PUBLIC_SETTINGS_URL}/api/twilio/incoming-sms
 *
 * Twilio Advanced Opt-Out still handles carrier STOP at the Messaging Service
 * level; this endpoint keeps Kenoo's consent + alert preference state in sync
 * and answers HELP.
 */
export async function POST(request: Request) {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) {
    console.error("[twilio] TWILIO_AUTH_TOKEN is not configured");
    return new NextResponse(emptyTwiml(), {
      status: 500,
      headers: { "Content-Type": "text/xml; charset=utf-8" },
    });
  }

  const form = await request.formData();
  const params: Record<string, string> = {};
  form.forEach((value, key) => {
    if (typeof value === "string") params[key] = value;
  });

  const signature = request.headers.get("x-twilio-signature");
  const webhookUrl =
    process.env.TWILIO_INCOMING_SMS_WEBHOOK_URL ||
    `${(process.env.NEXT_PUBLIC_SETTINGS_URL || "https://settings.kenoo.io").replace(/\/$/, "")}/api/twilio/incoming-sms`;

  const valid = validateTwilioSignature({
    authToken,
    signature,
    url: webhookUrl,
    params,
  });

  if (!valid) {
    console.warn("[twilio] Invalid request signature");
    return new NextResponse("Forbidden", { status: 403 });
  }

  const from = params.From ?? "";
  const body = (params.Body ?? "").trim().toUpperCase();

  try {
    if (
      body === "STOP" ||
      body === "STOPALL" ||
      body === "UNSUBSCRIBE" ||
      body === "CANCEL" ||
      body === "END" ||
      body === "QUIT"
    ) {
      const users = await findUsersByPhone(from);
      if (users.length > 0) {
        await optOutUsers(users, from);
      }
      // Empty TwiML: Messaging Service Advanced Opt-Out already replies.
      return new NextResponse(emptyTwiml(), {
        headers: { "Content-Type": "text/xml; charset=utf-8" },
      });
    }

    if (body === "HELP" || body === "INFO") {
      return new NextResponse(twimlMessage(KENOO_SMS_HELP_REPLY), {
        headers: { "Content-Type": "text/xml; charset=utf-8" },
      });
    }

    return new NextResponse(emptyTwiml(), {
      headers: { "Content-Type": "text/xml; charset=utf-8" },
    });
  } catch (error) {
    console.error("[twilio] incoming SMS handler failed:", error);
    return new NextResponse(emptyTwiml(), {
      status: 500,
      headers: { "Content-Type": "text/xml; charset=utf-8" },
    });
  }
}
