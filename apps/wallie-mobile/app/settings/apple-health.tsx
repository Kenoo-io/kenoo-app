import { useMemo } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Redirect } from "expo-router";

import {
  SettingsScreenShell,
  createSettingsStyles,
} from "@/components/settings/SettingsUI";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useAppleHealth } from "@/hooks/useAppleHealth";

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

export default function AppleHealthSettingsScreen() {
  const { user, loading } = useAuth();
  const { colors, isDark } = useTheme();
  const styles = useMemo(
    () => createSettingsStyles(colors, isDark),
    [colors, isDark],
  );
  const {
    supported,
    enabled,
    status,
    lastError,
    lastSyncedAt,
    connect,
    disconnect,
  } = useAppleHealth();

  if (!loading && !user) {
    return <Redirect href="/login" />;
  }

  const syncedLabel = formatSyncedAt(lastSyncedAt);
  const syncing = status === "syncing";
  const busy = syncing;

  let body: string;
  if (Platform.OS !== "ios") {
    body = "HealthKit sync is available on iPhone builds of Wallie.";
  } else if (!supported) {
    body =
      "HealthKit is not available on this device. Rebuild the iOS development client after installing HealthKit native modules.";
  } else if (enabled) {
    body =
      "Wallie keeps your Kenoo health profile updated automatically from Apple Health.";
  } else {
    body =
      "Connect Apple Health to sync activity, sleep, and other health data into your Kenoo profile.";
  }

  const canConnect =
    Platform.OS === "ios" && supported && !enabled && !busy;
  const canDisconnect =
    Platform.OS === "ios" && supported && enabled && !busy;

  return (
    <SettingsScreenShell
      colors={colors}
      styles={styles}
      title="Apple Health"
      showBack
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.detailCard}>
          <Text style={styles.detailTitle}>
            {enabled ? "Connected" : "Not connected"}
          </Text>
          <Text style={styles.detailBody}>{body}</Text>
          {enabled && syncedLabel ? (
            <Text style={styles.detailMeta}>Last update {syncedLabel}</Text>
          ) : null}
          {lastError ? (
            <Text style={[styles.detailMeta, { color: colors.danger }]}>
              {lastError}
            </Text>
          ) : null}

          {canConnect ? (
            <Pressable
              onPress={() => void connect()}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && { opacity: 0.85 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Connect Apple Health"
            >
              <Text style={styles.primaryButtonText}>Connect</Text>
            </Pressable>
          ) : null}

          {canDisconnect ? (
            <Pressable
              onPress={() => void disconnect()}
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && { opacity: 0.85 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Disconnect Apple Health"
            >
              <Text
                style={[
                  styles.secondaryButtonText,
                  styles.destructiveButtonText,
                ]}
              >
                Disconnect
              </Text>
            </Pressable>
          ) : null}

          {busy ? (
            <View style={{ paddingVertical: 12, alignItems: "center" }}>
              <ActivityIndicator color={colors.iconMuted} />
            </View>
          ) : null}
        </View>
      </ScrollView>
    </SettingsScreenShell>
  );
}
