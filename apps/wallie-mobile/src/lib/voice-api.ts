import * as FileSystem from "expo-file-system";

import { getWallieWebUrl } from "./env";
import { getAccessToken } from "./supabase";
import { textForSpeech } from "./voice-text";

function logVoice(event: string, details?: Record<string, unknown>) {
  if (__DEV__) {
    console.log(`[wallie-mobile] voice ${event}`, details ?? "");
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  const chunks: string[] = [];

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const slice = bytes.subarray(i, i + chunkSize);
    let chunk = "";
    for (let j = 0; j < slice.length; j++) {
      chunk += String.fromCharCode(slice[j]);
    }
    chunks.push(chunk);
  }

  return btoa(chunks.join(""));
}

function combineAbortSignals(
  timeoutMs: number,
  external?: AbortSignal,
): { signal: AbortSignal; cleanup: () => void } {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  const onExternalAbort = () => controller.abort();
  if (external) {
    if (external.aborted) {
      controller.abort();
    } else {
      external.addEventListener("abort", onExternalAbort, { once: true });
    }
  }

  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timeout);
      external?.removeEventListener("abort", onExternalAbort);
    },
  };
}

async function voiceFetch(
  path: string,
  init: RequestInit,
  timeoutMs = 90_000,
  externalSignal?: AbortSignal,
): Promise<Response> {
  const baseUrl = getWallieWebUrl();
  const url = `${baseUrl}${path}`;

  logVoice("→", { url, method: init.method ?? "GET" });

  const { signal, cleanup } = combineAbortSignals(timeoutMs, externalSignal);

  try {
    const response = await fetch(url, {
      ...init,
      signal,
    });
    logVoice("←", { url, status: response.status, ok: response.ok });
    return response;
  } catch (error) {
    if (externalSignal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }
    const message =
      error instanceof Error ? error.message : "Network request failed";
    console.error("[wallie-mobile] voice network error:", { url, message });
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Voice request timed out. Please try again.");
    }
    throw new Error(
      `Voice network error (${baseUrl}). On a physical device, localhost will not work — use production Wallie or set NEXT_PUBLIC_WALLIE_MOBILE_WEB_URL. ${message}`,
    );
  } finally {
    cleanup();
  }
}

export async function transcribeAudio(uri: string): Promise<string> {
  const token = await getAccessToken();
  if (!token) throw new Error("Not authenticated");

  const formData = new FormData();
  formData.append("audio", {
    uri,
    name: "recording.m4a",
    type: "audio/m4a",
  } as unknown as Blob);

  const response = await voiceFetch("/api/walli/transcribe", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const details =
      typeof (err as { details?: string }).details === "string"
        ? (err as { details: string }).details
        : undefined;
    throw new Error(
      typeof (err as { error?: string }).error === "string"
        ? details
          ? `${(err as { error: string }).error}: ${details}`
          : (err as { error: string }).error
        : `Transcription failed (${response.status})`,
    );
  }

  const data = (await response.json()) as { text?: string };
  return data.text?.trim() ?? "";
}

export async function fetchSpeechFileUri(
  text: string,
  signal?: AbortSignal,
): Promise<string> {
  const token = await getAccessToken();
  if (!token) throw new Error("Not authenticated");

  const speechText = textForSpeech(text);
  if (!speechText) {
    throw new Error("No speakable text in Wallie's reply");
  }

  const response = await voiceFetch(
    "/api/walli/tts",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: speechText }),
    },
    90_000,
    signal,
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const details =
      typeof (err as { details?: string }).details === "string"
        ? (err as { details: string }).details
        : undefined;
    throw new Error(
      typeof (err as { error?: string }).error === "string"
        ? details
          ? `${(err as { error: string }).error}: ${details}`
          : (err as { error: string }).error
        : `Speech generation failed (${response.status})`,
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  if (arrayBuffer.byteLength < 128) {
    throw new Error("Speech generation returned an empty audio file");
  }

  const base64 = arrayBufferToBase64(arrayBuffer);
  const fileUri = `${FileSystem.cacheDirectory}wallie-tts-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.mp3`;
  await FileSystem.writeAsStringAsync(fileUri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const info = await FileSystem.getInfoAsync(fileUri);
  logVoice("tts file", {
    uri: fileUri,
    exists: info.exists,
    size: "size" in info ? info.size : undefined,
    bytes: arrayBuffer.byteLength,
  });

  if (!info.exists || ("size" in info && (info.size ?? 0) < 128)) {
    throw new Error("Failed to save speech audio on device");
  }

  return fileUri;
}
