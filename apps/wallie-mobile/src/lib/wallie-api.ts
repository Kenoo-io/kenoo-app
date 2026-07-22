import {
  createWallieNdjsonParser,
  parseWallieEmailDraft,
  parseWallieStreamResponse,
  parseWallieStreamText,
  type WallieChatPayload,
  type WallieLoadingStatus,
  type WallieStreamLine,
} from "@walls/wallie-core";

import { getWallieApiUrl } from "./env";

function logChat(event: string, details?: Record<string, unknown>) {
  if (__DEV__) {
    console.log(`[wallie-mobile] ${event}`, details ?? "");
  }
}

/**
 * Progressive NDJSON over XHR — React Native's fetch often omits response.body,
 * which would force buffering the entire agent reply before any onDelta fires.
 */
function sendWallieChatViaXhr(
  url: string,
  payload: WallieChatPayload,
  options: {
    onDelta?: (delta: string) => void;
    onStatus?: (status: WallieLoadingStatus) => void;
  },
  signal?: AbortSignal,
): Promise<WallieStreamLine> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const parser = createWallieNdjsonParser(options);
    let processed = 0;

    const pushNewText = () => {
      const text = xhr.responseText ?? "";
      if (text.length <= processed) return;
      const chunk = text.slice(processed);
      processed = text.length;
      parser.push(chunk);
    };

    xhr.open("POST", url);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.responseType = "text";

    xhr.onprogress = () => {
      try {
        pushNewText();
      } catch (error) {
        xhr.abort();
        reject(error);
      }
    };

    xhr.onload = () => {
      try {
        pushNewText();
        if (xhr.status < 200 || xhr.status >= 300) {
          reject(
            new Error(
              `Wallie API error ${xhr.status}${
                xhr.responseText ? `: ${xhr.responseText.slice(0, 200)}` : ""
              }`,
            ),
          );
          return;
        }
        resolve(parser.finish());
      } catch (error) {
        reject(error);
      }
    };

    xhr.onerror = () => {
      reject(new Error("Network request failed"));
    };

    xhr.onabort = () => {
      reject(new DOMException("Aborted", "AbortError"));
    };

    const onAbort = () => xhr.abort();
    if (signal) {
      if (signal.aborted) {
        reject(new DOMException("Aborted", "AbortError"));
        return;
      }
      signal.addEventListener("abort", onAbort, { once: true });
    }

    xhr.addEventListener(
      "loadend",
      () => {
        signal?.removeEventListener("abort", onAbort);
      },
      { once: true },
    );

    xhr.send(JSON.stringify(payload));
  });
}

export async function sendWallieChat(
  payload: WallieChatPayload,
  options: {
    onDelta?: (delta: string) => void;
    onStatus?: (status: WallieLoadingStatus) => void;
    signal?: AbortSignal;
  } = {},
): Promise<WallieStreamLine> {
  const url = getWallieApiUrl();
  const { signal, onDelta, onStatus } = options;
  const streamOptions = { onDelta, onStatus };

  logChat("chat → Hetzner", {
    url,
    model: payload.model,
    userId: payload.userId,
    threadId: payload.threadId ?? null,
    messageLength: payload.message.length,
    hasOnDelta: !!onDelta,
  });

  // Prefer XHR whenever we need live deltas — RN fetch streaming is unreliable.
  if (onDelta) {
    logChat("chat via XHR stream", { reason: "live onDelta" });
    return sendWallieChatViaXhr(url, payload, streamOptions, signal);
  }

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal,
  });

  logChat("chat ← Hetzner", {
    status: response.status,
    ok: response.ok,
    hasStreamingBody: !!response.body,
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    const error = new Error(
      `Wallie API error ${response.status}${body ? `: ${body.slice(0, 200)}` : ""}`,
    );
    console.error("[wallie-mobile] chat error:", error.message);
    throw error;
  }

  if (response.body) {
    return parseWallieStreamResponse(response.body, streamOptions);
  }

  // React Native fetch often omits response.body; buffer the NDJSON stream instead.
  logChat("chat fallback", { reason: "response.body missing, using text()" });
  const text = await response.text();
  logChat("chat fallback done", { bytes: text.length });
  return parseWallieStreamText(text, streamOptions);
}

export { parseWallieEmailDraft };
