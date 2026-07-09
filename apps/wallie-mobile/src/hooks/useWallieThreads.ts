import { useCallback, useEffect, useState } from "react";
import type { WallieThread } from "@walls/wallie-core";

import { getSupabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

export function useWallieThreads() {
  const { user } = useAuth();
  const [threads, setThreads] = useState<WallieThread[]>([]);
  const [loading, setLoading] = useState(true);

  const loadThreads = useCallback(async () => {
    if (!user?.id) {
      setThreads([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await getSupabase()
      .from("wallie_threads")
      .select("id, title, created_at, updated_at, is_pinned")
      .eq("user_id", user.id)
      .eq("is_archived", false)
      .order("is_pinned", { ascending: false })
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("[wallie-mobile] load threads:", error);
    } else {
      setThreads(data ?? []);
    }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    void loadThreads();
  }, [loadThreads]);

  const createThread = useCallback(async () => {
    if (!user?.id) return null;

    const { data, error } = await getSupabase()
      .from("wallie_threads")
      .insert({ user_id: user.id, title: null })
      .select("id, title, created_at, updated_at, is_pinned")
      .single();

    if (error || !data) {
      console.error("[wallie-mobile] create thread:", error);
      return null;
    }

    setThreads((prev) => [data, ...prev]);
    return data.id;
  }, [user?.id]);

  const updateThreadTitle = useCallback(
    async (threadId: string, title: string) => {
      if (!user?.id) return;

      const { error } = await getSupabase()
        .from("wallie_threads")
        .update({ title, updated_at: new Date().toISOString() })
        .eq("id", threadId)
        .eq("user_id", user.id);

      if (error) {
        console.error("[wallie-mobile] update title:", error);
        return;
      }

      setThreads((prev) =>
        prev.map((thread) =>
          thread.id === threadId
            ? { ...thread, title, updated_at: new Date().toISOString() }
            : thread,
        ),
      );
    },
    [user?.id],
  );

  const archiveThread = useCallback(
    async (threadId: string) => {
      if (!user?.id) return;

      const { error } = await getSupabase()
        .from("wallie_threads")
        .update({ is_archived: true })
        .eq("id", threadId)
        .eq("user_id", user.id);

      if (error) {
        console.error("[wallie-mobile] archive thread:", error);
        return;
      }

      setThreads((prev) => prev.filter((thread) => thread.id !== threadId));
    },
    [user?.id],
  );

  return {
    threads,
    loading,
    reload: loadThreads,
    createThread,
    updateThreadTitle,
    archiveThread,
  };
}
