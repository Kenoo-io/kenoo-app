import { NextResponse } from "next/server";
import OpenAI from "openai";

import { createClient } from "@walls/supabase/server";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API Key not configured" },
        { status: 500 },
      );
    }

    const formData = await req.formData();
    const audio = formData.get("audio");

    if (!audio || !(audio instanceof Blob)) {
      return NextResponse.json(
        { error: "Audio file is required" },
        { status: 400 },
      );
    }

    const file = new File([audio], "recording.webm", {
      type: audio.type || "audio/webm",
    });

    const transcription = await openai.audio.transcriptions.create({
      file,
      model: "whisper-1",
    });

    return NextResponse.json({ text: transcription.text?.trim() ?? "" });
  } catch (error) {
    console.error("Wallie transcribe error:", error);
    return NextResponse.json(
      {
        error: "Failed to transcribe audio",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
