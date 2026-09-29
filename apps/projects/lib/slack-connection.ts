"use client";

import * as React from "react";

export type SlackConnection = {
  id: string;
  teamName: string | null;
  createdAt: string;
};

type SlackConnectionCache = {
  connection: SlackConnection | null;
  loaded: boolean;
  loading: boolean;
};

let cache: SlackConnectionCache = { connection: null, loaded: false, loading: false };
let pendingRequest: Promise<SlackConnection | null> | null = null;
const listeners = new Set<() => void>();

function publish() { listeners.forEach((listener) => listener()); }
function updateCache(update: Partial<SlackConnectionCache>) { cache = { ...cache, ...update }; publish(); }

async function fetchSlackConnection(): Promise<SlackConnection | null> {
  const response = await fetch("/api/integrations/slack", { cache: "no-store" });
  if (!response.ok) throw new Error("Unable to load Slack connection");
  const payload = await response.json() as { connected?: boolean; connection?: SlackConnection };
  return payload.connected ? payload.connection ?? null : null;
}

async function loadSlackConnection() {
  if (pendingRequest) return pendingRequest;
  updateCache({ loading: true });
  pendingRequest = fetchSlackConnection()
    .then((connection) => { updateCache({ connection, loaded: true, loading: false }); return connection; })
    .catch((error: unknown) => { updateCache({ loading: false }); throw error; })
    .finally(() => { pendingRequest = null; });
  return pendingRequest;
}

export function setCachedSlackConnection(connection: SlackConnection | null) {
  updateCache({ connection, loaded: true, loading: false });
}

export function useSlackConnection() {
  const [state, setState] = React.useState(cache);
  const refetch = React.useCallback(async () => {
    try { return await loadSlackConnection(); } catch { return null; }
  }, []);
  React.useEffect(() => {
    const subscribe = () => setState(cache);
    listeners.add(subscribe);
    if (!cache.loaded) void refetch();
    return () => { listeners.delete(subscribe); };
  }, [refetch]);
  return { connection: state.connection, loading: state.loading || !state.loaded, refetch };
}
