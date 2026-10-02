import { NextResponse, type NextRequest } from "next/server";

import { handleProtectedAppRequest } from "@walls/auth/middleware";

/**
 * These machine-to-machine routes authenticate Supabase OAuth Bearer tokens in
 * their route handlers. They must bypass the browser-session middleware, which
 * otherwise redirects valid MCP requests to the Portal login page.
 *
 * Keep this list exact so no broader API namespace becomes publicly reachable.
 */
const MCP_BEARER_ROUTES = new Set([
  "/api/mcp/ad-delivery-status",
  "/api/mcp/daily-budget",
]);

export async function middleware(request: NextRequest) {
  if (MCP_BEARER_ROUTES.has(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  return handleProtectedAppRequest(request, {
    appSlug: process.env.NEXT_PUBLIC_ADPILOT_APP_SLUG || "adpilot",
  });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|geo/|maplibre/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mjs|geojson)$).*)",
  ],
};
