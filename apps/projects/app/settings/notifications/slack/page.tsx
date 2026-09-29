import { Suspense } from "react";

import { SlackNotificationsPage } from "@/components/settings/slack-notifications-page";

export default function SlackNotificationsSettingsPage() {
  return <Suspense fallback={<main className="min-h-full px-6 py-8 md:px-10"><p className="text-sm font-light text-neutral-500">Loading notifications…</p></main>}><SlackNotificationsPage /></Suspense>;
}
