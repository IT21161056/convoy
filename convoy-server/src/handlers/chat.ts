import type { Server, Socket } from "socket.io";
import { nanoid } from "nanoid";
import {
  EVENTS,
  type ChatSendPayload,
  type ChatMessageSnapshot,
  type ChatSendAck,
} from "../types";
import { convoys, socketToMember, touch } from "../state";

function roomOf(convoyId: string) {
  return `convoy:${convoyId}`;
}

const MAX_LENGTH = 500;
const MAX_MESSAGES_BUFFER = 500;

export function registerChat(socket: Socket, io: Server) {
  socket.on(
    EVENTS.CHAT_SEND,
    (
      payload: ChatSendPayload,
      ack?: (res: ChatSendAck) => void,
    ) => {
      const ref = socketToMember.get(socket.id);
      if (!ref) return;
      if (ref.memberId !== payload.memberId) return; // spoof guard

      const convoy = convoys.get(ref.convoyId);
      if (!convoy) return;

      const member = convoy.members.find((m) => m.id === payload.memberId);
      if (!member) return;

      const text = payload.text.trim();
      if (!text) return;
      if (text.length > MAX_LENGTH) return;

      if (!convoy.settings.membersCanChat && convoy.hostId !== ref.memberId) {
        socket.emit(EVENTS.ERROR, {
          code: "CHAT_DISABLED",
          message: "Chat is disabled for members.",
        });
        return;
      }

      // Idempotent de-duplication by clientId (DESIGN.md §14.1, §14.3)
      if (payload.clientId && convoy.processedClientIds.has(payload.clientId)) {
        console.log(`[chat] de-duplicated duplicate clientId: ${payload.clientId}`);
        const existing = convoy.messages.find((m) => m.clientId === payload.clientId);
        if (existing && typeof ack === "function") {
          ack({
            ok: true,
            clientId: payload.clientId,
            seq: existing.seq ?? convoy.seq,
            id: existing.id,
          });
        }
        return;
      }

      // Monotonic sequence number increment (DESIGN.md §14.3)
      convoy.seq = (convoy.seq ?? 0) + 1;

      const message: ChatMessageSnapshot = {
        id: `m_${nanoid(8)}`,
        senderId: member.id,
        senderName: member.name,
        text,
        sentAt: new Date().toISOString(),
        clientId: payload.clientId,
        seq: convoy.seq,
      };

      if (payload.clientId) {
        convoy.processedClientIds.add(payload.clientId);
      }

      // Bounded buffer capped at 500 items (DESIGN.md §15.1)
      convoy.messages.push(message);
      if (convoy.messages.length > MAX_MESSAGES_BUFFER) {
        convoy.messages.shift();
      }

      touch();

      // Broadcast to everyone in the room including the sender
      io.to(roomOf(convoy.id)).emit(EVENTS.CHAT_MESSAGE, message);

      // Acknowledge back to sender with assigned sequence number
      if (typeof ack === "function") {
        ack({
          ok: true,
          clientId: payload.clientId,
          seq: convoy.seq,
          id: message.id,
        });
      }
    },
  );
}
