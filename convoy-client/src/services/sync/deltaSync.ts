import { chatRepo, convoyRepo } from "@/db";
import { chatStore } from "@/features/chat/useChat";
import { convoyStore } from "@/features/convoy";
import { getSocket, on } from "@/services/socket";
import {
  EVENTS,
  type SyncReplyPayload,
  type SyncRequestPayload,
} from "@/services/socket/events";
import type { ChatMessage } from "@/types";

/**
 * ============================================================================
 * Delta Resynchronization Service (DESIGN.md §14.3)
 * ============================================================================
 * Manages monotonic sequence-based delta resynchronization:
 * 1. Reads lastSeq cursor from SQLite.
 * 2. Asks server for all missed messages & latest location snapshots after lastSeq.
 * 3. Applies conflict resolution rules:
 *    - Chat: ordered by server sequence; local DB updated and chatStore rendered.
 *    - Location: last-write-wins by device timestamp; older updates dropped.
 *    - Membership: server is the source of truth.
 * 4. Advances lastSeq in SQLite.
 */

let listenerRegistered = false;

export const deltaSync = {
  /**
   * Initialize listener for broadcast or unsolicited SYNC_REPLY events.
   */
  init(): void {
    if (listenerRegistered) return;
    listenerRegistered = true;
    on<SyncReplyPayload>(EVENTS.SYNC_REPLY, (reply) => {
      this.applyDelta(reply);
    });
  },

  /**
   * Request missed delta events from server since lastSeq cursor.
   */
  async requestSync(
    convoyId: string,
    memberId?: string,
  ): Promise<SyncReplyPayload | null> {
    const socket = getSocket();
    if (!socket.connected) return null;

    const currentConvoy = convoyStore.getState();
    const effectiveMemberId = memberId ?? currentConvoy?.selfId;
    if (!effectiveMemberId) return null;

    const lastSeq = convoyRepo.getLastSeq(convoyId);

    const payload: SyncRequestPayload = {
      convoyId,
      memberId: effectiveMemberId,
      lastSeq,
    };

    return new Promise((resolve) => {
      let settled = false;
      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          resolve(null);
        }
      }, 5000);

      socket.emit(EVENTS.SYNC, payload, (reply: SyncReplyPayload) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (reply) {
          this.applyDelta(reply);
        }
        resolve(reply ?? null);
      });
    });
  },

  /**
   * Apply incoming delta sync payload to SQLite and in-memory stores.
   */
  applyDelta(reply: SyncReplyPayload): void {
    const { convoyId, currentSeq, messages, locations } = reply;

    // 1. Merge missed chat messages into SQLite and chatStore
    for (const m of messages) {
      const chatMsg: ChatMessage = {
        id: m.id,
        senderId: m.senderId,
        senderName: m.senderName,
        text: m.text,
        sentAt: m.sentAt,
        status: "sent",
        seq: m.seq,
      };
      chatRepo.saveMessage(chatMsg, convoyId, "sent", m.seq);
      chatStore.applyMessage(chatMsg, convoyId);
    }

    // 2. Merge location updates: last-write-wins by device timestamp (DESIGN.md §14.3)
    const current = convoyStore.getState();
    if (current && current.id === convoyId) {
      for (const loc of locations) {
        if (loc.lat == null || loc.lng == null) continue;
        const existingMember = current.members.find(
          (m) => m.id === loc.memberId,
        );
        const existingTs = existingMember?.location?.timestamp ?? 0;

        // Apply only if newer device timestamp
        if (loc.timestamp >= existingTs) {
          convoyStore.patchMember(loc.memberId, {
            location: {
              lat: loc.lat,
              lng: loc.lng,
              heading: loc.heading,
              speed: loc.speed,
              timestamp: loc.timestamp,
            },
            lastSeenAt: new Date(loc.timestamp).toISOString(),
            status: "live",
          });
        }
      }
    }

    // 3. Update lastSeq cursor in SQLite
    convoyRepo.updateLastSeq(convoyId, currentSeq);
  },
};
