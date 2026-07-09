import { NextResponse, type NextRequest } from "next/server";

import { getWallieChatUrl } from "@/lib/wallie-api-server";

export async function POST(request: NextRequest) {
  const remoteUrl = getWallieChatUrl();

  if (!remoteUrl) {
    return NextResponse.json(
      {
        error:
          "Wallie chat API is not configured. Set NEXT_PUBLIC_WALLIE_API_URL to your wallie-api base URL (Hetzner POST /).",
      },
      { status: 501 },
    );
  }

  const body = await request.text();

  let upstream: Response;
  try {
    upstream = await fetch(remoteUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body,
    });
  } catch (error) {
    console.error("[wallie] Chat proxy failed:", { remoteUrl, error });
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to reach the Wallie backend.",
      },
      { status: 502 },
    );
  }

  if (!upstream.ok) {
    const errorBody = await upstream.text().catch(() => "");
    console.error("[wallie] Chat proxy upstream error:", {
      remoteUrl,
      status: upstream.status,
      body: errorBody.slice(0, 500),
    });
    return new NextResponse(errorBody || upstream.statusText, {
      status: upstream.status,
      headers: {
        "Content-Type":
          upstream.headers.get("content-type") ?? "application/json",
      },
    });
  }

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: {
      "Content-Type":
        upstream.headers.get("content-type") ?? "application/json",
      "Cache-Control": "no-store",
      "X-Wallie-Backend": "remote",
    },
  });
}
