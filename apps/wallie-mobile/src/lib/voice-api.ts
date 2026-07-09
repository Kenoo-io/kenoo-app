import * as FileSystem from "expo-file-system";

import { getAccessToken } from "./supabase";
import { getWallieWebUrl } from "./env";

export async function transcribeAudio(uri: string): Promise<string> {
  const token = await getAccessToken();
  if (!token) throw new Error("Not authenticated");

  const formData = new FormData();
  formData.append("audio", {
    uri,
    name: "recording.m4a",
    type: "audio/m4a",
  } as unknown as Blob);

  const response = await fetch(`${getWallieWebUrl()}/api/walli/transcribe`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(
      typeof (err as { error?: string }).error === "string"
        ? (err as { error: string }).error
        : "Transcription failed",
    );
  }

  const data = (await response.json()) as { text?: string };
  return data.text?.trim() ?? "";
}

export async function fetchSpeechFileUri(text: string): Promise<string> {
  const token = await getAccessToken();
  if (!token) throw new Error("Not authenticated");

  const response = await fetch(`${getWallieWebUrl()}/api/walli/tts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(
      typeof (err as { error?: string }).error === "string"
        ? (err as { error: string }).error
        : "Speech generation failed",
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }

  const fileUri = `${FileSystem.cacheDirectory}wallie-tts-${Date.now()}.mp3`;
  await FileSystem.writeAsStringAsync(fileUri, btoa(binary), {
    encoding: FileSystem.EncodingType.Base64,
  });
  return fileUri;
}
