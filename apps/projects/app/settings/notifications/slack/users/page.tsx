import { Suspense } from "react";

import { SlackUserMappingsPage } from "@/components/settings/slack-user-mappings-page";

export default function SlackUserMappingsSettingsPage() {
  return <Suspense fallback={<main className="min-h-full px-6 py-8 md:px-10"><p className="text-sm font-light text-neutral-500">Loading Slack users…</p></main>}><SlackUserMappingsPage /></Suspense>;
}
