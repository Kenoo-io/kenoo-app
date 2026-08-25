import { withMeteredProduct } from "@/lib/metered-route";

export async function GET(request: Request) {
  return withMeteredProduct(request, "ping", async () => ({
    ok: true,
    product: "ping",
    message: "Kenoo Platform is reachable.",
    timestamp: new Date().toISOString(),
  }));
}

export async function POST(request: Request) {
  return GET(request);
}
