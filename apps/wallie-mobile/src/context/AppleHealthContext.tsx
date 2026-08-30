import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AppState, Platform } from "react-native";

import { useAuth } from "@/context/AuthContext";
import {
  getAppleHealthLastSyncAt,
  isAppleHealthEnabled,
  isAppleHealthSupported,
  requestAppleHealthAuthorization,
  setAppleHealthEnabled,
  startAppleHealthBackgroundSync,
  stopAppleHealthBackgroundSync,
  syncAppleHealth,
  syncAppleHealthIfEnabled,
  type AppleHealthSyncResult,
} from "@/lib/healthkit";
import { HEALTHKIT_MIN_SYNC_INTERVAL_MS } from "@/lib/healthkit/constants";

type SyncStatus = "idle" | "syncing" | "error" | "unsupported";

export type AppleHealthContextValue = {
  supported: boolean;
  enabled: boolean;
  status: SyncStatus;
  lastResult: AppleHealthSyncResult | null;
  lastError: string | null;
  lastSyncedAt: string | null;
  connect: () => Promise<boolean>;
  disconnect: () => Promise<void>;
};

const AppleHealthContext = createContext<AppleHealthContextValue | null>(null);

/**
 * Owns HealthKit → Supabase for the logged-in session.
 * Settings screens must not start/stop this; leaving Settings used to
 * disable background delivery and freeze daily steps until the next visit.
 */
export function AppleHealthProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [status, setStatus] = useState<SyncStatus>("idle");
  const [lastResult, setLastResult] = useState<AppleHealthSyncResult | null>(
    null,
  );
  const [lastError, setLastError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const syncingRef = useRef(false);
  const userIdRef = useRef<string | null>(null);

  useEffect(() => {
    userIdRef.current = user?.id ?? null;
  }, [user?.id]);

  useEffect(() => {
    setSupported(isAppleHealthSupported());
    void isAppleHealthEnabled().then(setEnabled);
    void getAppleHealthLastSyncAt().then(setLastSyncedAt);
  }, []);

  const runSync = useCallback(
    async (
      options: {
        forceFull?: boolean;
        quiet?: boolean;
        bypassMinInterval?: boolean;
      } = {},
    ) => {
      const userId = userIdRef.current;
      if (!userId || Platform.OS !== "ios" || syncingRef.current) return null;
      if (!isAppleHealthSupported()) {
        setStatus("unsupported");
        return null;
      }

      if (!options.forceFull && !options.bypassMinInterval) {
        const last = await getAppleHealthLastSyncAt();
        if (last) {
          const age = Date.now() - Date.parse(last);
          if (
            Number.isFinite(age) &&
            age >= 0 &&
            age < HEALTHKIT_MIN_SYNC_INTERVAL_MS
          ) {
            return null;
          }
        }
      }

      syncingRef.current = true;
      if (!options.quiet) setStatus("syncing");
      setLastError(null);

      try {
        const result = await syncAppleHealth(userId, {
          forceFull: options.forceFull,
        });
        setLastResult(result);
        setLastSyncedAt(new Date().toISOString());
        setStatus("idle");
        return result;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Sync failed";
        setLastError(message);
        setStatus("error");
        return null;
      } finally {
        syncingRef.current = false;
      }
    },
    [],
  );

  const connect = useCallback(async () => {
    if (!user?.id) return false;
    if (!isAppleHealthSupported()) {
      setStatus("unsupported");
      return false;
    }

    try {
      const ok = await requestAppleHealthAuthorization();
      if (!ok) {
        setLastError("Health access was not granted.");
        return false;
      }
      await setAppleHealthEnabled(true);
      setEnabled(true);
      await runSync({ forceFull: true });
      return true;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Could not connect Apple Health";
      setLastError(message);
      setStatus("error");
      return false;
    }
  }, [runSync, user?.id]);

  const disconnect = useCallback(async () => {
    await stopAppleHealthBackgroundSync();
    await setAppleHealthEnabled(false);
    setEnabled(false);
    setLastResult(null);
    setLastSyncedAt(null);
    setLastError(null);
    setStatus("idle");
  }, []);

  useEffect(() => {
    if (!user?.id || !enabled || Platform.OS !== "ios") return;

    let cancelled = false;

    void (async () => {
      try {
        const result = await syncAppleHealthIfEnabled(user.id);
        if (!cancelled && result) {
          setLastResult(result);
          setLastSyncedAt(new Date().toISOString());
        }
      } catch (error) {
        console.warn("[healthkit] startup sync failed", error);
      }

      if (cancelled) return;

      await startAppleHealthBackgroundSync(() => {
        void runSync({ quiet: true, bypassMinInterval: true });
      });
    })();

    const sub = AppState.addEventListener("change", (next) => {
      if (next !== "active" || syncingRef.current) return;
      void runSync({ quiet: true });
    });

    return () => {
      cancelled = true;
      sub.remove();
      // Tear down only when this session ends (logout / disconnect),
      // never when a settings screen unmounts.
      void stopAppleHealthBackgroundSync();
    };
  }, [enabled, runSync, user?.id]);

  const value = useMemo(
    () => ({
      supported,
      enabled,
      status,
      lastResult,
      lastError,
      lastSyncedAt,
      connect,
      disconnect,
    }),
    [
      supported,
      enabled,
      status,
      lastResult,
      lastError,
      lastSyncedAt,
      connect,
      disconnect,
    ],
  );

  return (
    <AppleHealthContext.Provider value={value}>
      {children}
    </AppleHealthContext.Provider>
  );
}

export function useAppleHealth() {
  const context = useContext(AppleHealthContext);
  if (!context) {
    throw new Error("useAppleHealth must be used within AppleHealthProvider");
  }
  return context;
}
