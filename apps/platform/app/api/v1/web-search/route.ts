import { NextResponse } from "next/server";

import { withMeteredProduct } from "@/lib/metered-route";

type SearchBody = {
  query?: string;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as SearchBody;
  const query = body.query?.trim();
  if (!query) {
    return NextResponse.json({ error: "query is required" }, { status: 400 });
  }

  const serperKey = process.env.SERPER_API_KEY?.trim();
  if (!serperKey) {
    return NextResponse.json(
      { error: "Web Search is not configured on this environment." },
      { status: 503 },
    );
  }

  return withMeteredProduct(request, "web-search", async () => {
    const response = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": serperKey,
      },
      body: JSON.stringify({ q: query }),
    });

    if (!response.ok) {
      throw new Error(`Search upstream failed (${response.status})`);
    }

    const data = (await response.json()) as Record<string, unknown>;
    return {
      query,
      organic: data.organic ?? [],
    };
  });
}
