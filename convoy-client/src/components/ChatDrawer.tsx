import { EmptyState, Sheet } from "@/components/ui";
import { chatCommands, chatStore, useChatMessages } from "@/features/chat";
import { getSelf, useConvoy } from "@/features/convoy";
import { colors, radii, spacing, typography } from "@/theme";
import type { ChatMessage } from "@/types";
import { useEffect, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

interface ChatDrawerProps {
  visible: boolean;
  onClose: () => void;
}

export function ChatDrawer({ visible, onClose }: ChatDrawerProps) {
  const messages = useChatMessages();
  const convoy = useConvoy();
  const [draft, setDraft] = useState("");
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const self = getSelf(convoy);
  const isHost = self?.isHost ?? false;
  const canSend = isHost || (convoy?.settings.membersCanChat ?? true);
  const maxLength = 500;

  useEffect(() => {
    if (convoy?.id) {
      chatStore.loadForConvoy(convoy.id);
    }
  }, [convoy?.id]);

  useEffect(() => {
    if (visible && messages.length > 0) {
      setTimeout(() => {
        listRef.current?.scrollToEnd({ animated: false });
      }, 50);
    }
  }, [visible, messages.length]);

  const handleSend = () => {
    const trimmed = draft.trim();
    if (!trimmed || !canSend) return;
    chatCommands.send(trimmed);
    setDraft("");
    setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, 30);
  };
  return (
    <Sheet visible={visible} onClose={onClose} title="Convoy Chat">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        {messages.length === 0 ? (
          <View style={styles.emptyWrap}>
            <EmptyState
              icon="💬"
              title="No messages yet"
              hint="Say hi to your convoy."
            />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            renderItem={({ item }) => (
              <MessageBubble message={item} selfId={convoy?.selfId} />
            )}
            contentContainerStyle={styles.listContent}
            style={styles.list}
            onContentSizeChange={() => {
              listRef.current?.scrollToEnd({ animated: false });
            }}
          />
        )}
        <View style={styles.inputBar}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={canSend ? "Message…" : "Chat is disabled"}
            placeholderTextColor={colors.textMuted}
            style={[styles.input, !canSend && styles.inputDisabled]}
            returnKeyType="send"
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
            multiline={false}
            maxLength={maxLength}
            editable={canSend}
          />
          <Pressable
            onPress={handleSend}
            disabled={!canSend || !draft.trim()}
            style={({ pressed }) => [
              styles.sendButton,
              (!canSend || !draft.trim()) && styles.sendDisabled,
              pressed && styles.sendPressed,
            ]}
          >
            <Text style={styles.sendText}>Send</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Sheet>
  );
}

function MessageBubble({
  message,
  selfId,
}: {
  message: ChatMessage;
  selfId?: string;
}) {
  const isSelf = Boolean(selfId && message.senderId === selfId);
  const isPending = message.status === "pending";
  const isFailed = message.status === "failed";

  return (
    <View
      style={[
        styles.bubbleRow,
        isSelf ? styles.bubbleRowSelf : styles.bubbleRowOther,
      ]}
    >
      <View style={styles.bubbleGroup}>
        {!isSelf ? (
          <Text style={styles.senderName}>{message.senderName}</Text>
        ) : null}
        <View
          style={[
            styles.bubble,
            isSelf ? styles.bubbleSelf : styles.bubbleOther,
            isPending && styles.bubblePending,
          ]}
        >
          <Text style={styles.bubbleText}>{message.text}</Text>
        </View>
        {isSelf && isPending && (
          <View style={styles.statusRow}>
            <Text style={styles.statusPending}>⏳ pending</Text>
          </View>
        )}
        {isSelf && isFailed && (
          <View style={styles.statusRow}>
            <Text style={styles.statusFailed}>⚠️ failed</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    maxHeight: 360,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  bubbleRow: {
    flexDirection: "row",
  },
  bubbleRowSelf: {
    justifyContent: "flex-end",
  },
  bubbleRowOther: {
    justifyContent: "flex-start",
  },
  bubbleGroup: {
    maxWidth: "80%",
    gap: 4,
  },
  senderName: {
    ...typography.label,
    fontSize: 12,
    color: colors.textMuted,
    marginLeft: spacing.sm,
  },
  bubble: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
  },
  bubbleSelf: {
    backgroundColor: colors.primary,
    borderTopRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: colors.raised,
    borderTopLeftRadius: 4,
  },
  bubbleText: {
    ...typography.body,
    fontSize: 15,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  input: {
    flex: 1,
    height: 44,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    backgroundColor: colors.raised,
    borderWidth: 1,
    borderColor: colors.divider,
    color: colors.text,
    fontFamily: typography.body.fontFamily,
    fontSize: 15,
  },
  sendButton: {
    paddingHorizontal: spacing.lg,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sendDisabled: {
    opacity: 0.4,
  },
  sendPressed: {
    opacity: 0.85,
  },
  sendText: {
    ...typography.button,
    color: colors.background,
  },
  emptyWrap: {
    height: 240,
  },
  inputDisabled: {
    opacity: 0.5,
  },
  bubblePending: {
    opacity: 0.8,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingRight: spacing.xs,
  },
  statusPending: {
    ...typography.label,
    fontSize: 11,
    color: colors.primary,
  },
  statusFailed: {
    ...typography.label,
    fontSize: 11,
    color: colors.alert,
  },
});
