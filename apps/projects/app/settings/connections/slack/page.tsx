import { Suspense } from "react";

import { SlackConnectionPage } from "@/components/settings/slack-connection-page";

export default function SlackSettingsPage() {
  return <Suspense fallback={<main className="min-h-full px-6 py-8 md:px-10"><p className="text-sm font-light text-neutral-500">Loading connection…</p></main>}><SlackConnectionPage /></Suspense>;
}
