import { createHmac, timingSafeEqual } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";

import { setGitHubInstallationConnectionActive } from "@/lib/github-connections-server";

type GitHubWebhookPayload = {
  action?: string;
  installation?: { id?: number };
};

function validGitHubSignature(input: {
  body: string;
  signature: string | null;
}): boolean {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret || !input.signature?.startsWith("sha256=")) return false;

  const expected = `sha256=${createHmac("sha256", secret)
    .update(input.body, "utf8")
    .digest("hex")}`;
  const actualBuffer = Buffer.from(input.signature, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");
  return (
    actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

/**
 * GitHub App webhook endpoint. It intentionally handles only installation
 * lifecycle events today; project/PR/issue syncing can be added independently.
 */
export async function POST(request: NextRequest) {
  const body = await request.text();
  if (
    !validGitHubSignature({
      body,
      signature: request.headers.get("x-hub-signature-256"),
    })
  ) {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
  }

  let payload: GitHubWebhookPayload;
  try {
    payload = JSON.parse(body) as GitHubWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 });
  }

  const event = request.headers.get("x-github-event");
  const installationId = payload.installation?.id;
  if (!installationId) return NextResponse.json({ ok: true });

  try {
    if (event === "installation") {
      if (["deleted", "suspend"].includes(payload.action ?? "")) {
        await setGitHubInstallationConnectionActive({
          installationId: String(installationId),
          active: false,
        });
      } else if (payload.action === "unsuspend") {
        await setGitHubInstallationConnectionActive({
          installationId: String(installationId),
          active: true,
        });
      }
    }

    // GitHub Apps receive installation_repositories automatically. The current
    // UI does not persist individual repositories yet, so accepting this event
    // keeps deliveries healthy without introducing a second data model.
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[projects] GitHub webhook:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
