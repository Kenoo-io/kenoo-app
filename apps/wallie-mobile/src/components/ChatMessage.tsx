import { StyleSheet, Text, View } from "react-native";
import type { WallieMessage } from "@walls/wallie-core";

import { colors, spacing } from "@/constants/theme";

interface ChatMessageProps {
  message: WallieMessage;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.sender === "user";

  return (
    <View
      style={[
        styles.row,
        isUser ? styles.rowUser : styles.rowAi,
      ]}
    >
      <View
        style={[
          styles.bubble,
          isUser ? styles.userBubble : styles.aiBubble,
        ]}
      >
        <Text style={[styles.text, isUser ? styles.userText : styles.aiText]}>
          {message.content}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
  },
  rowUser: {
    alignItems: "flex-end",
  },
  rowAi: {
    alignItems: "flex-start",
  },
  bubble: {
    maxWidth: "85%",
    borderRadius: 18,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  userBubble: {
    backgroundColor: colors.userBubble,
  },
  aiBubble: {
    backgroundColor: colors.aiBubble,
  },
  text: {
    fontSize: 16,
    lineHeight: 22,
  },
  userText: {
    color: colors.text,
  },
  aiText: {
    color: colors.text,
  },
});
