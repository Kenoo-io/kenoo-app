import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API Key not configured" },
        { status: 500 },
      );
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a title generator. Generate a short, descriptive title (3-5 words max) for conversations. Only respond with the title, nothing else. No quotes, no punctuation at the end.",
        },
        {
          role: "user",
          content: `Generate a title for this message: "${message}"`,
        },
      ],
      temperature: 0.7,
      max_tokens: 20,
    });

    const title = completion.choices[0]?.message?.content?.trim() || null;
    return NextResponse.json({ title });
  } catch (error) {
    console.error("Error generating title:", error);
    return NextResponse.json(
      {
        error: "Failed to generate title",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
