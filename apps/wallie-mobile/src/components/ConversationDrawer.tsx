import { useEffect, useMemo, useState } from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import type { WallieThread } from "@walls/wallie-core";

import { ThreadList } from "@/components/ThreadList";
import { getSidebarContentInset } from "@/constants/drawer-layout";
import { spacing, type AppColors } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { getSupabase } from "@/lib/supabase";

interface ConversationDrawerProps {
  threads: WallieThread[];
  currentThreadId: string | null;
  loading?: boolean;
  onSelect: (threadId: string) => void;
  onNewChat: () => void;
  onClose?: () => void;
  onRenameThread: (threadId: string, title: string) => void;
  onPinThread: (threadId: string) => void;
  onArchiveThread: (threadId: string) => void;
  onDeleteThread: (threadId: string) => void;
}

function createStyles(colors: AppColors, isDark: boolean) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: "transparent",
    },
    listWrap: {
      flex: 1,
      paddingTop: spacing.sm,
    },
    bottomBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      paddingBottom: spacing.sm,
    },
    chatButton: {
      height: 48,
      paddingHorizontal: 16,
      borderRadius: 24,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: isDark
        ? "rgba(59, 130, 246, 0.72)"
        : "rgba(0, 102, 178, 0.82)",
      borderWidth: 1,
      borderColor: isDark
        ? "rgba(191, 219, 254, 0.5)"
        : "rgba(255, 255, 255, 0.6)",
      shadowColor: isDark ? "#3B82F6" : colors.wallsBlue,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: isDark ? 0.45 : 0.35,
      shadowRadius: 14,
      elevation: 8,
    },
    chatButtonPressed: {
      opacity: 0.88,
      transform: [{ scale: 0.98 }],
    },
    chatButtonText: {
      color: "#FFFFFF",
      fontSize: 16,
      fontWeight: "600",
    },
    profileButton: {
      width: 48,
      height: 48,
      borderRadius: 24,
      overflow: "hidden",
      backgroundColor: colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: colors.shadowColor,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.2,
      shadowRadius: 12,
      elevation: 6,
    },
    profileButtonPressed: {
      opacity: 0.9,
      transform: [{ scale: 0.97 }],
    },
    avatar: {
      width: "100%",
      height: "100%",
    },
    avatarFallback: {
      ...StyleSheet.absoluteFillObject,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.inputBackground,
    },
    avatarInitials: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
    },
  });
}

function initialsFrom(name: string | null, email: string | null | undefined) {
  const trimmed = name?.trim();
  if (trimmed) {
    const parts = trimmed.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
    }
    return trimmed.slice(0, 2).toUpperCase();
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return "?";
}

export function ConversationDrawer({
  threads,
  currentThreadId,
  loading,
  onSelect,
  onNewChat,
  onClose,
  onRenameThread,
  onPinThread,
  onArchiveThread,
  onDeleteThread,
}: ConversationDrawerProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const { width: screenWidth } = useWindowDimensions();
  const sidebarRightInset = getSidebarContentInset(screenWidth);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setAvatarUrl(null);
      setDisplayName(null);
      return;
    }

    let cancelled = false;
    void getSupabase()
      .from("users")
      .select("first_name, last_name, avatar_url")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (cancelled || !data) return;
        const name = [data.first_name, data.last_name]
          .filter(Boolean)
          .join(" ")
          .trim();
        setDisplayName(name || null);
        setAvatarUrl(
          typeof data.avatar_url === "string" && data.avatar_url.length > 0
            ? data.avatar_url
            : null,
        );
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const openSettings = () => {
    onClose?.();
    router.push("/settings");
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <View style={[styles.listWrap, { paddingRight: sidebarRightInset }]}>
        <ThreadList
          threads={threads}
          currentThreadId={currentThreadId}
          loading={loading}
          onSelect={onSelect}
          onRenameThread={onRenameThread}
          onPinThread={onPinThread}
          onArchiveThread={onArchiveThread}
          onDeleteThread={onDeleteThread}
        />
      </View>

      <View style={[styles.bottomBar, { paddingRight: sidebarRightInset }]}>
        <Pressable
          onPress={onNewChat}
          accessibilityRole="button"
          accessibilityLabel="New chat"
          style={({ pressed }) => [
            styles.chatButton,
            pressed && styles.chatButtonPressed,
          ]}
        >
          <Ionicons name="create-outline" size={20} color="#FFFFFF" />
          <Text style={styles.chatButtonText}>Chat</Text>
        </Pressable>

        <Pressable
          onPress={openSettings}
          accessibilityRole="button"
          accessibilityLabel="Open settings"
          style={({ pressed }) => [
            styles.profileButton,
            pressed && styles.profileButtonPressed,
          ]}
        >
          {avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              style={styles.avatar}
              accessibilityIgnoresInvertColors
            />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarInitials}>
                {initialsFrom(displayName, user?.email)}
              </Text>
            </View>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
