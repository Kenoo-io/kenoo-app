"use client";

import * as React from "react";

export type GitHubConnection = {
  id: string;
  provider_account_id: string | null;
  created_at: string;
  token_payload: {
    account_login?: string | null;
    account_type?: string | null;
    repository_selection?: "all" | "selected" | null;
  } | null;
};

async function fetchGitHubConnection(): Promise<GitHubConnection | null> {
  const response = await fetch("/api/connections", { cache: "no-store" });
  if (!response.ok) throw new Error("Unable to load GitHub connection");
  const payload = (await response.json()) as { connection?: GitHubConnection | null };
  return payload.connection ?? null;
}

export function useGitHubConnection() {
  const [connection, setConnection] = React.useState<GitHubConnection | null>(null);
  const [loading, setLoading] = React.useState(true);

  const refetch = React.useCallback(async () => {
    setLoading(true);
    try {
      setConnection(await fetchGitHubConnection());
    } catch {
      setConnection(null);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    // Schedule after the effect commits. This keeps the initial fetch async and
    // avoids a synchronous state update during React's effect phase.
    void Promise.resolve().then(refetch);
  }, [refetch]);

  return { connection, loading, refetch };
}
