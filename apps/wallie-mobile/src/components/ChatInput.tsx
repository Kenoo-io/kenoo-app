import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { AppIcon } from "@/components/AppIcon";

import { colors, spacing } from "@/constants/theme";

interface ChatInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  isLoading?: boolean;
  isRecording?: boolean;
  isVoiceBusy?: boolean;
  onVoicePressIn?: () => void;
  onVoicePressOut?: () => void;
}

export function ChatInput({
  value,
  onChangeText,
  onSend,
  isLoading = false,
  isRecording = false,
  isVoiceBusy = false,
  onVoicePressIn,
  onVoicePressOut,
}: ChatInputProps) {
  const canSend = value.trim().length > 0 && !isLoading;

  return (
    <View style={styles.container}>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder="Message Wallie..."
          placeholderTextColor={colors.textMuted}
          multiline
          editable={!isLoading && !isVoiceBusy}
        />
        {onVoicePressIn && onVoicePressOut ? (
          <Pressable
            onPressIn={onVoicePressIn}
            onPressOut={onVoicePressOut}
            disabled={isLoading || isVoiceBusy}
            style={[
              styles.voiceButton,
              isRecording && styles.voiceButtonActive,
            ]}
          >
            {isVoiceBusy ? (
              <ActivityIndicator color={colors.wallsBlue} />
            ) : (
              <AppIcon
                name={isRecording ? "micActive" : "mic"}
                size={18}
                color={isRecording ? "#fff" : colors.wallsBlue}
              />
            )}
          </Pressable>
        ) : null}
        <Pressable
          onPress={onSend}
          disabled={!canSend}
          style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <AppIcon name="send" size={18} color="#fff" />
          )}
        </Pressable>
      </View>
      <Text style={styles.hint}>Hold the mic to talk, or type and send.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 22,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: colors.background,
    color: colors.text,
  },
  voiceButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  voiceButtonActive: {
    backgroundColor: colors.wallsBlue,
    borderColor: colors.wallsBlue,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.wallsBlue,
  },
  sendButtonDisabled: {
    opacity: 0.45,
  },
  hint: {
    marginTop: spacing.xs,
    textAlign: "center",
    fontSize: 12,
    color: colors.textMuted,
  },
});
