import { NextResponse } from "next/server";

import { withMeteredProduct } from "@/lib/metered-route";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { slug } = await context.params;
  return withMeteredProduct(request, slug, async () => {
    throw new Error("This product is not wired yet.");
  });
}

export async function POST(request: Request, context: RouteContext) {
  return GET(request, context);
}

export function OPTIONS() {
  return NextResponse.json({}, { status: 204 });
}
