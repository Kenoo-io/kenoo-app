import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const DEFAULT_FROM_EMAIL = "noreply@mail.kenoo.io";

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

  return `<!doctype html><html><body style="margin:0;background:#fafafa;color:#171717;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border:1px solid #e5e5e5;border-radius:16px">
      <tr><td style="padding:32px"><p style="margin:0 0 20px;font-size:15px;line-height:22px">${greeting}</p>
      <h1 style="margin:0 0 14px;font-size:24px;line-height:30px;letter-spacing:-.03em">You have a new task</h1>
      <p style="margin:0 0 24px;color:#525252;font-size:15px;line-height:23px"><strong>${escapeHtml(input.actorName)}</strong> assigned you <strong>“${escapeHtml(input.taskTitle)}”</strong>${project}.</p>
      <a href="${escapeHtml(input.taskUrl)}" style="display:inline-block;border-radius:10px;background:#171717;color:#fff;padding:13px 20px;font-size:14px;font-weight:600;text-decoration:none">Open task</a>
      <p style="margin:28px 0 0;color:#737373;font-size:12px;line-height:18px">You’re receiving this because task-assignment email notifications are enabled in Projects settings.</p></td></tr>
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
