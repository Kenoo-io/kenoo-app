import { NextResponse, type NextRequest } from "next/server";

import { handleProtectedAppRequest } from "@walls/auth/middleware";

const NOTIFICATION_WORKER_PATH = "/api/internal/process-project-notifications";

function hasNotificationWorkerSecret(request: NextRequest) {
  const expectedSecret = (
    process.env.PROJECT_NOTIFICATION_WORKER_SECRET ||
    process.env.CRON_SECRET
  )?.trim();

  return (
    request.nextUrl.pathname === NOTIFICATION_WORKER_PATH &&
    Boolean(expectedSecret) &&
    request.headers.get("authorization") === `Bearer ${expectedSecret}`
  );
}

export async function middleware(request: NextRequest) {
  if (hasNotificationWorkerSecret(request)) {
    return NextResponse.next();
  }

  return handleProtectedAppRequest(request, {
    appSlug: process.env.NEXT_PUBLIC_PROJECTS_APP_SLUG || "projects",
    publicPaths: ["/api/webhooks/github"],
  });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
