import {
  parseWallieEmailDraft,
  parseWallieStreamResponse,
  type WallieChatPayload,
  type WallieLoadingStatus,
  type WallieStreamLine,
} from "@walls/wallie-core";

import { getWallieApiUrl } from "./env";

export async function sendWallieChat(
  payload: WallieChatPayload,
  options: {
    onDelta?: (delta: string) => void;
    onStatus?: (status: WallieLoadingStatus) => void;
  } = {},
): Promise<WallieStreamLine> {
  const response = await fetch(getWallieApiUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Wallie API error ${response.status}${body ? `: ${body.slice(0, 200)}` : ""}`,
    );
  }

  return parseWallieStreamResponse(response.body, options);
}

export { parseWallieEmailDraft };
