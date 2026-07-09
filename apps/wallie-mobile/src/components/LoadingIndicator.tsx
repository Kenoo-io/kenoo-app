import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import type { WallieLoadingStatus } from "@walls/wallie-core";

import { colors, spacing } from "@/constants/theme";

interface LoadingIndicatorProps {
  status?: WallieLoadingStatus;
}

function getStatusLabel(status?: WallieLoadingStatus): string {
  if (status === "searching") return "Wallie is searching the web...";
  if (status === "people_search") return "Wallie is finding contacts...";
  if (status === "thinking") return "Wallie is thinking...";
  return "Wallie is thinking...";
}

export function LoadingIndicator({ status }: LoadingIndicatorProps) {
  return (
    <View style={styles.container}>
      <View style={styles.dot} />
      <ActivityIndicator color={colors.wallsBlue} />
      <Text style={styles.text}>{getStatusLabel(status)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.wallsYellow,
  },
  text: {
    fontSize: 14,
    color: colors.textMuted,
  },
});
