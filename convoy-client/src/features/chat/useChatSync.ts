import { on } from "@/services/socket";
import { EVENTS, type ChatMessageSnapshot } from "@/services/socket/events";
import { outboxSync } from "@/services/sync";
import type { ChatMessage } from "@/types";
import { useEffect } from "react";
import { chatStore } from "./useChat";

/**
 * ============================================================================
 * Chat Sync Hook (DESIGN.md §14.3, §26.2)
 * ============================================================================
 * Listens for incoming server broadcasts. Reconciles optimistic pending messages
 * using client IDs, purges the outbox entry, and updates local SQLite status.
 */
export function useChatSync() {
  useEffect(() => {
    const off = on<ChatMessageSnapshot>(EVENTS.CHAT_MESSAGE, (payload) => {
      const message: ChatMessage = {
        id: payload.id,
        senderId: payload.senderId,
        senderName: payload.senderName,
        text: payload.text,
        sentAt: payload.sentAt,
        status: "sent",
        seq: payload.seq,
      };

      if (payload.clientId) {
        outboxSync.acknowledge(payload.clientId);
        chatStore.reconcileOptimisticMessage(payload.clientId, message);
      } else {
        chatStore.applyMessage(message);
      }
    });
    return off;
  }, []);
}
