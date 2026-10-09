import { chatRepo } from "@/db";
import type { ChatMessage, MessageStatus } from "@/types";
import { createStore } from "@/utils/store";
import { useSyncExternalStore } from "react";

/**
 * ============================================================================
 * Chat Store & Local Cache (DESIGN.md §14, §24, §26)
 * ============================================================================
 * Backed by SQLite chatRepo. Renders optimistic pending messages instantly,
 * reconciles server sequence numbers, and survives app restarts.
 */

const messageStore = createStore<ChatMessage[]>([]);
let currentConvoyId: string | null = null;

function sortMessages(msgs: ChatMessage[]): ChatMessage[] {
  return [...msgs].sort((a, b) => {
    if (a.seq !== undefined && b.seq !== undefined) {
      return a.seq - b.seq;
    }
    return new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime();
  });
}

export const chatStore = {
  /**
   * Load persisted messages for a convoy from SQLite into the in-memory cache.
   */
  loadForConvoy(convoyId: string) {
    currentConvoyId = convoyId;
    messageStore.setState(sortMessages(chatRepo.getMessages(convoyId)));
  },

  /**
   * Append or update a message. Idempotent against duplicates and echoes.
   */
  applyMessage(msg: ChatMessage, convoyId?: string) {
    const targetConvoy = convoyId ?? currentConvoyId;
    if (targetConvoy) {
      chatRepo.saveMessage(msg, targetConvoy, msg.status ?? "sent", msg.seq);
    }

    messageStore.setState((prev) => {
      const index = prev.findIndex((m) => m.id === msg.id);
      if (index >= 0) {
        return [
          ...prev.slice(0, index),
          { ...prev[index], ...msg },
          ...prev.slice(index + 1),
        ];
      }
      return sortMessages([...prev, msg]);
    });
  },

  /**
   * Reconcile an optimistic pending message when the server broadcasts its confirmed snapshot.
   */
  reconcileOptimisticMessage(
    clientId: string,
    confirmedMsg: ChatMessage,
    convoyId?: string,
  ) {
    const targetConvoy = convoyId ?? currentConvoyId;
    if (targetConvoy) {
      // Clean up optimistic temporary entry and persist server-assigned record
      chatRepo.updateMessageStatus(clientId, "sent", confirmedMsg.seq);
      chatRepo.saveMessage(confirmedMsg, targetConvoy, "sent", confirmedMsg.seq);
    }

    messageStore.setState((prev) => {
      const pendingIndex = prev.findIndex((m) => m.id === clientId);
      let updated: ChatMessage[];
      if (pendingIndex >= 0) {
        updated = [
          ...prev.slice(0, pendingIndex),
          confirmedMsg,
          ...prev.slice(pendingIndex + 1),
        ];
      } else if (!prev.some((m) => m.id === confirmedMsg.id)) {
        updated = [...prev, confirmedMsg];
      } else {
        updated = prev;
      }
      return sortMessages(updated);
    });
  },

  /**
   * Update message status (e.g., 'failed' if delivery fails permanently).
   */
  updateStatus(id: string, status: MessageStatus) {
    const targetConvoy = currentConvoyId;
    if (targetConvoy) {
      chatRepo.updateMessageStatus(id, status);
    }
    messageStore.setState((prev) =>
      prev.map((m) => (m.id === id ? { ...m, status } : m)),
    );
  },

  /**
   * Clear in-memory chat and purge local SQLite messages.
   */
  clear(convoyId?: string) {
    currentConvoyId = null;
    chatRepo.clearMessages(convoyId);
    messageStore.setState([]);
  },
};

export function useChatMessages(): ChatMessage[] {
  return useSyncExternalStore(
    messageStore.subscribe,
    messageStore.getSnapshot,
    messageStore.getSnapshot,
  );
}
