import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";

// Deliberately separate env vars from the SES-sending AWS credential used
// elsewhere in this monorepo (AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY) —
// this is a different, narrowly-scoped IAM identity (sqs:SendMessage only,
// see systems/infra/terraform/main.tf's platform_queue_publisher), and
// reusing the same env var names risks silently sending with the wrong
// credential.
function getSqsClient(): SQSClient | null {
  const region = process.env.SYSTEMS_QUEUE_AWS_REGION?.trim();
  const accessKeyId = process.env.SYSTEMS_QUEUE_AWS_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.SYSTEMS_QUEUE_AWS_SECRET_ACCESS_KEY?.trim();

  if (!region || !accessKeyId || !secretAccessKey) {
    return null;
  }

  return new SQSClient({ region, credentials: { accessKeyId, secretAccessKey } });
}

/**
 * Best-effort "wake up" ping for a scale-to-zero ECS worker. The systems_jobs
 * row inserted alongside this call is always the source of truth for the job
 * itself — if this fails, the job just waits for the worker's next scale-up
 * (or the next job's wake message) instead of being lost.
 */
export async function notifySystemQueue(
  queueUrl: string | undefined,
  messageBody: string,
): Promise<void> {
  if (!queueUrl) {
    return;
  }

  const client = getSqsClient();
  if (!client) {
    console.error(
      "[systems-queue] AWS SQS credentials are not configured (need SYSTEMS_QUEUE_AWS_ACCESS_KEY_ID, SYSTEMS_QUEUE_AWS_SECRET_ACCESS_KEY, SYSTEMS_QUEUE_AWS_REGION)",
    );
    return;
  }

  try {
    await client.send(new SendMessageCommand({ QueueUrl: queueUrl, MessageBody: messageBody }));
  } catch (error) {
    console.error("[systems-queue] failed to notify queue:", error);
  }
}
