import { Suspense } from "react";

import { GitHubConnectionPage } from "@/components/settings/github-connection-page";

export default function GitHubSettingsPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-full px-6 py-8 md:px-10">
          <p className="text-sm font-light text-neutral-500">
            Loading connection…
          </p>
        </main>
      }
    >
      <GitHubConnectionPage />
    </Suspense>
  );
}
