import { outboxRepo, type OutboxItem } from "@/db";
import { getSocket } from "@/services/socket";
import { EVENTS } from "@/services/socket/events";
import { createStore } from "@/utils/store";
import { useSyncExternalStore } from "react";

/**
 * ============================================================================
 * Outbox Sync Engine (DESIGN.md §14.1, §14.3, §26.2)
 * ============================================================================
 * Coordinates the local-first Outbox Pattern:
 * 1. User actions are written locally to SQLite as 'pending' and queued in outbox.
 * 2. When socket connects or reconnects, outbox flushes items oldest-first.
 * 3. Server de-duplicates by clientId and broadcasts/acknowledges with sequence numbers.
 * 4. Client marks local records as 'sent' and purges them from the outbox.
 */

const countStore = createStore<number>(0);
let isFlushing = false;

function refreshCount() {
  countStore.setState(outboxRepo.getPendingCount());
}

export const outboxSync = {
  /**
   * Initializes the in-memory count from SQLite at startup.
   */
  init(): void {
    try {
      refreshCount();
    } catch (err) {
      console.warn("[outboxSync] init error:", err);
    }
  },

  /**
   * Enqueue a new mutation into the outbox and attempt immediate flush if online.
   */
  enqueue<T = any>(item: {
    clientId: string;
    convoyId: string;
    type: string;
    payload: T;
  }): void {
    outboxRepo.enqueue(item);
    refreshCount();

    const socket = getSocket();
    if (socket.connected) {
      void this.flush();
    }
  },

  /**
   * Acknowledge and remove an item from the outbox (called when server sends ack or broadcast).
   */
  acknowledge(clientId: string): void {
    outboxRepo.remove(clientId);
    refreshCount();
  },

  /**
   * Mark an item as failed in SQLite and outbox.
   */
  fail(clientId: string, error: string): void {
    outboxRepo.incrementAttempts(clientId, error);
    refreshCount();
  },

  /**
   * Flushes queued items oldest-first over the active socket connection.
   */
  async flush(): Promise<void> {
    if (isFlushing) return;
    const socket = getSocket();
    if (!socket.connected) return;

    isFlushing = true;

    try {
      const items: OutboxItem[] = outboxRepo.peekPending(20);
      if (items.length === 0) {
        countStore.setState(0);
        return;
      }

      for (const item of items) {
        if (!socket.connected) break;

        try {
          if (item.type === EVENTS.CHAT_SEND) {
            // Include client-generated ID for server de-duplication (DESIGN.md §14.3)
            const payload = {
              ...item.payload,
              clientId: item.clientId,
            };
            socket.emit(
              EVENTS.CHAT_SEND,
              payload,
              (ack?: { ok: boolean; clientId?: string; seq: number; id: string }) => {
                if (ack && ack.ok) {
                  this.acknowledge(item.clientId);
                }
              },
            );
            outboxRepo.incrementAttempts(item.clientId);
          } else {
            socket.emit(item.type, item.payload);
            outboxRepo.incrementAttempts(item.clientId);
          }
        } catch (err: any) {
          console.warn(`[outboxSync] Failed delivering item ${item.clientId}:`, err?.message);
          outboxRepo.incrementAttempts(item.clientId, err?.message);
        }
      }

      refreshCount();
    } finally {
      isFlushing = false;
    }
  },

  /**
   * Clear outbox records for a given convoy (or all).
   */
  clear(convoyId?: string): void {
    outboxRepo.clear(convoyId);
    refreshCount();
  },

  /**
   * Current count of pending outbox records.
   */
  getCount(): number {
    return countStore.getState();
  },
};

/**
 * Hook to reactively observe the pending outbox count for UI badges and pills.
 */
export function useOutboxPendingCount(): number {
  return useSyncExternalStore(
    countStore.subscribe,
    countStore.getSnapshot,
    countStore.getSnapshot,
  );
}
