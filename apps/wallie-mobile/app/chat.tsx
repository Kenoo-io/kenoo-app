import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Redirect } from "expo-router";
import { getWallieModel, WALLIE_AI_MODELS } from "@walls/wallie-core";

import { AppIcon } from "@/components/AppIcon";

import { ChatInput } from "@/components/ChatInput";
import { ChatMessage } from "@/components/ChatMessage";
import { LoadingIndicator } from "@/components/LoadingIndicator";
import { ThreadList } from "@/components/ThreadList";
import { colors, spacing } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useWallieChat } from "@/hooks/useWallieChat";
import { useWallieThreads } from "@/hooks/useWallieThreads";
import { useWallieVoice } from "@/hooks/useWallieVoice";

export default function ChatScreen() {
  const { user, loading, signOut } = useAuth();
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [threadsOpen, setThreadsOpen] = useState(false);
  const [modelsOpen, setModelsOpen] = useState(false);
  const listRef = useRef<FlatList>(null);

  const {
    threads,
    loading: threadsLoading,
    createThread,
    updateThreadTitle,
    archiveThread,
  } = useWallieThreads();

  const {
    messages,
    setMessages,
    isLoading,
    loadingStatus,
    selectedModel,
    setSelectedModel,
    loadMessages,
    sendMessage,
  } = useWallieChat({
    threadId: currentThreadId,
    onThreadId: (threadId) => setCurrentThreadId(threadId),
    onThreadTitle: updateThreadTitle,
  });

  const handleSend = useCallback(async () => {
    const text = inputValue;
    setInputValue("");
    try {
      await sendMessage(text);
      requestAnimationFrame(() => {
        listRef.current?.scrollToEnd({ animated: true });
      });
    } catch (error) {
      Alert.alert(
        "Message failed",
        error instanceof Error ? error.message : "Please try again.",
      );
    }
  }, [inputValue, sendMessage]);

  const voice = useWallieVoice(
    useCallback(
      async (text: string) => {
        setInputValue(text);
        try {
          return (await sendMessage(text)) ?? null;
        } catch (error) {
          Alert.alert(
            "Voice message failed",
            error instanceof Error ? error.message : "Please try again.",
          );
          return null;
        }
      },
      [sendMessage],
    ),
  );

  useEffect(() => {
    if (currentThreadId) {
      void loadMessages(currentThreadId);
    } else {
      setMessages([]);
    }
  }, [currentThreadId, loadMessages, setMessages]);

  const handleNewChat = useCallback(async () => {
    setCurrentThreadId(null);
    setMessages([]);
    setThreadsOpen(false);
  }, [setMessages]);

  const handleSelectThread = useCallback((threadId: string) => {
    setCurrentThreadId(threadId);
    setThreadsOpen(false);
  }, []);

  if (!loading && !user) {
    return <Redirect href="/login" />;
  }

  const modelInfo = getWallieModel(selectedModel);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable style={styles.iconButton} onPress={() => setThreadsOpen(true)}>
          <AppIcon name="menu" size={22} />
        </Pressable>

        <Pressable style={styles.modelButton} onPress={() => setModelsOpen(true)}>
          <Text style={styles.modelProvider}>{modelInfo.provider}</Text>
          <Text style={styles.modelName}>{modelInfo.model}</Text>
        </Pressable>

        <Pressable
          style={styles.iconButton}
          onPress={() => {
            Alert.alert("Sign out", "Are you sure?", [
              { text: "Cancel", style: "cancel" },
              {
                text: "Sign out",
                style: "destructive",
                onPress: () => void signOut(),
              },
            ]);
          }}
        >
          <AppIcon name="logout" size={20} />
        </Pressable>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messages}
        renderItem={({ item }) => <ChatMessage message={item} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Hey, I'm Wallie.</Text>
            <Text style={styles.emptyBody}>
              Ask me about talent, outreach, research, or hold the mic to talk.
            </Text>
          </View>
        }
        onContentSizeChange={() =>
          listRef.current?.scrollToEnd({ animated: true })
        }
      />

      {isLoading ? <LoadingIndicator status={loadingStatus} /> : null}

      <ChatInput
        value={inputValue}
        onChangeText={setInputValue}
        onSend={handleSend}
        isLoading={isLoading}
        isRecording={voice.isRecording}
        isVoiceBusy={voice.isProcessing || voice.isSpeaking}
        onVoicePressIn={() => void voice.startRecording().catch((error) => {
          Alert.alert(
            "Microphone error",
            error instanceof Error ? error.message : "Could not start recording.",
          );
        })}
        onVoicePressOut={() => void voice.stopRecording().catch((error) => {
          Alert.alert(
            "Voice error",
            error instanceof Error ? error.message : "Could not process voice.",
          );
        })}
      />

      <Modal visible={threadsOpen} animationType="slide">
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Conversations</Text>
            <Pressable onPress={() => setThreadsOpen(false)}>
              <AppIcon name="close" size={20} />
            </Pressable>
          </View>
          <ThreadList
            threads={threads}
            currentThreadId={currentThreadId}
            loading={threadsLoading}
            onSelect={handleSelectThread}
            onNewChat={handleNewChat}
          />
        </SafeAreaView>
      </Modal>

      <Modal visible={modelsOpen} transparent animationType="fade">
        <Pressable style={styles.modelOverlay} onPress={() => setModelsOpen(false)}>
          <View style={styles.modelSheet}>
            {WALLIE_AI_MODELS.map((model) => (
              <Pressable
                key={model.value}
                style={[
                  styles.modelRow,
                  selectedModel === model.value && styles.modelRowActive,
                ]}
                onPress={() => {
                  setSelectedModel(model.value);
                  setModelsOpen(false);
                }}
              >
                <Text style={styles.modelRowProvider}>{model.provider}</Text>
                <Text style={styles.modelRowName}>{model.model}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  modelButton: {
    alignItems: "center",
    paddingHorizontal: spacing.sm,
  },
  modelProvider: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  modelName: {
    fontSize: 13,
    color: colors.textMuted,
  },
  messages: {
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  emptyBody: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.textMuted,
    textAlign: "center",
  },
  modal: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
  },
  modelOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  modelSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  modelRow: {
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.sm,
    backgroundColor: colors.background,
  },
  modelRowActive: {
    borderWidth: 1,
    borderColor: colors.wallsYellow,
  },
  modelRowProvider: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  modelRowName: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
});
