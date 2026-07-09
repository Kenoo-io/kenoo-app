import { NextResponse } from "next/server";
import OpenAI from "openai";

import { getWallieApiUser } from "@/lib/wallie-api-auth";
import { textForSpeech } from "@/lib/wallie/voice-text";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MAX_TTS_CHARS = 4096;

export async function POST(req: Request) {
  try {
    const { user, error: authError } = await getWallieApiUser(req);

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API Key not configured" },
        { status: 500 },
      );
    }

    const { text } = (await req.json()) as { text?: string };

    if (!text?.trim()) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    const speechText = textForSpeech(text).slice(0, MAX_TTS_CHARS);
    if (!speechText) {
      return NextResponse.json({ error: "No speakable text" }, { status: 400 });
    }

    const speech = await openai.audio.speech.create({
      model: "tts-1",
      voice: "nova",
      input: speechText,
      speed: 1.1,
    });

    const buffer = Buffer.from(await speech.arrayBuffer());

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Wallie TTS error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate speech",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
