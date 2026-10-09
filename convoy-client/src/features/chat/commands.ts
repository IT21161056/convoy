import { convoyStore, getSelf } from "@/features/convoy";
import { outboxSync } from "@/services/sync";
import { EVENTS, type ChatSendPayload } from "@/services/socket/events";
import type { ChatMessage } from "@/types";
import { chatStore } from "./useChat";

const MAX_LENGTH = 500;

export const chatCommands = {
  /**
   * Send a chat message with local-first optimistic queuing (DESIGN.md §14.1, §26.2).
   * 1. Generates unique clientId.
   * 2. Appends to local SQLite & chatStore as 'pending' (immediate UI render).
   * 3. Queues into durable outbox.
   * 4. Transmits over socket if online.
   */
  send(text: string) {
    const convoy = convoyStore.getState();
    if (!convoy) return;
    const trimmed = text.trim();
    if (!trimmed) return;
    if (trimmed.length > MAX_LENGTH) return;

    const self = getSelf(convoy);
    const clientId = `c_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const optimisticMsg: ChatMessage = {
      id: clientId,
      senderId: convoy.selfId,
      senderName: self?.name ?? "You",
      text: trimmed,
      sentAt: new Date().toISOString(),
      status: "pending",
    };

    // 1. Render immediately & save to SQLite as pending
    chatStore.applyMessage(optimisticMsg, convoy.id);

    // 2. Queue into durable outbox for offline-first delivery
    const payload: ChatSendPayload = {
      convoyId: convoy.id,
      memberId: convoy.selfId,
      text: trimmed,
      clientId,
    };

    outboxSync.enqueue({
      clientId,
      convoyId: convoy.id,
      type: EVENTS.CHAT_SEND,
      payload,
    });
  },
};
