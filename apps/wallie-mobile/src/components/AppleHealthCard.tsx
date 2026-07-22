import { useMemo } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { spacing, type AppColors } from "@/constants/theme";
import { useTheme } from "@/context/ThemeContext";
import { useAppleHealth } from "@/hooks/useAppleHealth";

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    card: {
      marginBottom: spacing.md,
      padding: spacing.md,
      borderRadius: 16,
      backgroundColor: colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      gap: spacing.sm,
    },
    title: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
    },
    body: {
      fontSize: 13,
      lineHeight: 18,
      color: colors.textMuted,
    },
    meta: {
      fontSize: 12,
      color: colors.textSubtle,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      marginTop: spacing.xs,
    },
    button: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: 12,
      backgroundColor: colors.primaryButton,
    },
    buttonSecondary: {
      backgroundColor: "transparent",
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    buttonText: {
      color: colors.primaryButtonText,
      fontSize: 14,
      fontWeight: "600",
    },
    buttonTextSecondary: {
      color: colors.text,
    },
    error: {
      fontSize: 12,
      color: colors.danger,
    },
  });
}

function formatSyncedAt(iso: string | null): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return null;
  }
}

export function AppleHealthCard() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const {
    supported,
    enabled,
    status,
    lastError,
    lastSyncedAt,
    connect,
    disconnect,
  } = useAppleHealth();

  if (Platform.OS !== "ios") {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>Apple Health</Text>
        <Text style={styles.body}>
          HealthKit sync is available on iPhone builds of Wallie.
        </Text>
      </View>
    );
  }

  if (!supported) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>Apple Health</Text>
        <Text style={styles.body}>
          HealthKit is not available on this device. Rebuild the iOS
          development client after installing HealthKit native modules.
        </Text>
      </View>
    );
  }

  const syncedLabel = formatSyncedAt(lastSyncedAt);
  const connecting = status === "syncing" && !enabled;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Apple Health</Text>
      <Text style={styles.body}>
        {enabled
          ? "Wallie keeps your Kenoo health profile updated automatically from Apple Health — steps, workouts, sleep, heart rate, and more."
          : "Connect once and Wallie will keep your Kenoo health profile updated automatically from Apple Health."}
      </Text>

      {enabled ? (
        <>
          <Text style={styles.meta}>
            Connected · updating automatically
            {syncedLabel ? ` · last update ${syncedLabel}` : ""}
          </Text>
          <View style={styles.row}>
            <Pressable
              style={[styles.button, styles.buttonSecondary]}
              onPress={() => void disconnect()}
            >
              <Text style={[styles.buttonText, styles.buttonTextSecondary]}>
                Disconnect
              </Text>
            </Pressable>
          </View>
        </>
      ) : (
        <View style={styles.row}>
          <Pressable
            style={styles.button}
            onPress={() => void connect()}
            disabled={connecting}
          >
            {connecting ? (
              <ActivityIndicator color={colors.primaryButtonText} />
            ) : (
              <Text style={styles.buttonText}>Connect Apple Health</Text>
            )}
          </Pressable>
        </View>
      )}

      {lastError ? <Text style={styles.error}>{lastError}</Text> : null}
    </View>
  );
}
