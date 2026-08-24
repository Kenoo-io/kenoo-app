import { type NextRequest, NextResponse } from "next/server";

import { handleProtectedAppRequest } from "@walls/auth/middleware";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/api/v1/") ||
    pathname.startsWith("/api/billing/webhook")
  ) {
    return NextResponse.next();
  }

  return handleProtectedAppRequest(request, {
    appSlug: process.env.NEXT_PUBLIC_PLATFORM_APP_SLUG || "platform",
  });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
