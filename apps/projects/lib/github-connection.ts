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

type GitHubConnectionCache = {
  connection: GitHubConnection | null;
  loaded: boolean;
  loading: boolean;
};

// Settings routes unmount as users navigate, so keep this small, account-scoped
// value in the client module instead of fetching it again on every visit. The
// account picker performs a full reload when it changes accounts, which also
// clears this module cache.
let cache: GitHubConnectionCache = {
  connection: null,
  loaded: false,
  loading: false,
};
let pendingRequest: Promise<GitHubConnection | null> | null = null;
const listeners = new Set<() => void>();

function publish() {
  listeners.forEach((listener) => listener());
}

function updateCache(update: Partial<GitHubConnectionCache>) {
  cache = { ...cache, ...update };
  publish();
}

async function loadGitHubConnection(): Promise<GitHubConnection | null> {
  if (pendingRequest) return pendingRequest;

  updateCache({ loading: true });
  pendingRequest = fetchGitHubConnection()
    .then((connection) => {
      updateCache({ connection, loaded: true, loading: false });
      return connection;
    })
    .catch((error: unknown) => {
      // Leave an existing cache entry intact when a refresh fails. This avoids
      // replacing a known connection with an incorrect "Not connected" state.
      updateCache({ loading: false });
      throw error;
    })
    .finally(() => {
      pendingRequest = null;
    });

  return pendingRequest;
}

/** Updates every mounted consumer after a successful connection mutation. */
export function setCachedGitHubConnection(connection: GitHubConnection | null) {
  updateCache({ connection, loaded: true, loading: false });
}

export function useGitHubConnection() {
  const [state, setState] = React.useState(cache);

  const refetch = React.useCallback(async () => {
    try {
      return await loadGitHubConnection();
    } catch {
      return null;
    }
  }, []);

  React.useEffect(() => {
    const subscribe = () => setState(cache);
    listeners.add(subscribe);
    // If this was already loaded during this browser session, render it right
    // away instead of making another round trip when a settings route remounts.
    if (!cache.loaded) void refetch();
    return () => listeners.delete(subscribe);
  }, [refetch]);

  return { connection: state.connection, loading: state.loading || !state.loaded, refetch };
}
