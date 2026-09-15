import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const DEFAULT_FROM_EMAIL = "noreply@mail.kenoo.io";
const KENOO_LOGO_URL = "https://assest.kenoo.io/logos/full-text.png";

type TaskAssignmentEmail = {
  to: string;
  recipientFirstName?: string | null;
  actorName: string;
  taskTitle: string;
  projectName?: string | null;
  taskUrl: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getSesClient(): SESClient | null {
  const region = process.env.AWS_REGION?.trim();
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY?.trim();
  if (!region || !accessKeyId || !secretAccessKey) return null;

  return new SESClient({
    region,
    credentials: { accessKeyId, secretAccessKey },
  });
}

function sourceAddress(): string {
  const from = process.env.SES_FROM_EMAIL?.trim() || DEFAULT_FROM_EMAIL;
  return from.includes("<") ? from : `Kenoo Projects <${from}>`;
}

function taskAssignmentHtml(input: TaskAssignmentEmail): string {
  const greeting = input.recipientFirstName?.trim()
    ? `Hi ${escapeHtml(input.recipientFirstName)},`
    : "Hi,";
  const project = input.projectName
    ? ` in <strong>${escapeHtml(input.projectName)}</strong>`
    : "";

  return `<!doctype html><html lang="en"><body style="margin:0;padding:0;background:#fcfcfc;color:#171717;-webkit-text-size-adjust:100%">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fcfcfc"><tr><td align="center" style="padding:32px 16px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#fff">
      <tr><td align="center" style="padding:32px 32px 24px"><img src="${KENOO_LOGO_URL}" alt="Kenoo" width="140" style="display:block;width:140px;max-width:100%;height:auto;border:0" /></td></tr>
      <tr><td style="padding:0 32px 8px"><h1 style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:24px;line-height:30px;font-weight:600;letter-spacing:-.03em;color:#111">You have a new task</h1></td></tr>
      <tr><td style="padding:0 32px 24px"><p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:22px;color:#6b6b6b"><strong style="color:#111">${escapeHtml(input.actorName)}</strong> assigned you <strong style="color:#111">“${escapeHtml(input.taskTitle)}”</strong>${project}.</p></td></tr>
      <tr><td style="padding:0 32px"><div style="height:1px;background:#e8e8e8"></div></td></tr>
      <tr><td style="padding:24px 32px 0"><p style="margin:0 0 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14px;line-height:21px;color:#444">${greeting} A task has been assigned to you in Projects.</p></td></tr>
      <tr><td align="center" style="padding:0 32px 32px"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="border-radius:12px;background:#111"><a href="${escapeHtml(input.taskUrl)}" target="_blank" style="display:inline-block;padding:14px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14px;font-weight:600;line-height:16px;color:#fff;text-decoration:none;border-radius:12px">Open task</a></td></tr></table></td></tr>
      <tr><td style="padding:20px 32px;background:#fafafa;text-align:center"><p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;line-height:18px;color:#6b6b6b">You’re receiving this because task-assignment email notifications are enabled in Projects settings.</p><p style="margin:10px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:11px;line-height:16px;color:#999">© Kenoo · <a href="https://kenoo.io" style="color:#999;text-decoration:underline">kenoo.io</a></p></td></tr>
    </table>
  </td></tr></table></body></html>`;
}

export async function sendTaskAssignmentEmail(
  input: TaskAssignmentEmail,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const client = getSesClient();
  if (!client) return { ok: false, reason: "Email service is not configured" };

  try {
    await client.send(
      new SendEmailCommand({
        Source: sourceAddress(),
        Destination: { ToAddresses: [input.to.trim().toLowerCase()] },
        Message: {
          Subject: { Data: "You’ve been assigned a new task", Charset: "UTF-8" },
          Body: { Html: { Data: taskAssignmentHtml(input), Charset: "UTF-8" } },
        },
      }),
    );
    return { ok: true };
  } catch (error) {
    console.error("[projects] task assignment email:", error);
    return { ok: false, reason: error instanceof Error ? error.message : "Email delivery failed" };
  }
}
