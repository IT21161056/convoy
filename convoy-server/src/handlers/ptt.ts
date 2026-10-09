import type { Server, Socket } from "socket.io";
import { nanoid } from "nanoid";
import {
  EVENTS,
  type PttBroadcastPayload,
  type PttClipSnapshot,
} from "../types";
import { convoys, socketToMember } from "../state";

function roomOf(convoyId: string) {
  return `convoy:${convoyId}`;
}

const MAX_BASE64_LENGTH = 1_500_000; // ~1 MB of raw audio
const MAX_DURATION_MS = 30_000;

export function registerPtt(socket: Socket, io: Server) {
  socket.on(EVENTS.PTT_BROADCAST, (payload: PttBroadcastPayload) => {
    const ref = socketToMember.get(socket.id);
    if (!ref) return;
    if (ref.memberId !== payload.memberId) return;

    const convoy = convoys.get(ref.convoyId);
    if (!convoy) return;

    const member = convoy.members.find((m) => m.id === payload.memberId);
    if (!member) return;

    if (!convoy.settings.membersCanPtt && convoy.hostId !== ref.memberId) {
      socket.emit(EVENTS.ERROR, {
        code: "PTT_DISABLED",
        message: "Push-to-talk is disabled for members.",
      });
      return;
    }

    if (typeof payload.audioBase64 !== "string") return;
    if (payload.audioBase64.length > MAX_BASE64_LENGTH) return;
    if (typeof payload.durationMs !== "number") return;
    if (payload.durationMs <= 0 || payload.durationMs > MAX_DURATION_MS) return;

    const clip: PttClipSnapshot = {
      id: `ptt_${nanoid(8)}`,
      senderId: member.id,
      senderName: member.name,
      audioBase64: payload.audioBase64,
      durationMs: payload.durationMs,
      sentAt: new Date().toISOString(),
    };

    // Send to everyone in the room INCLUDING the sender — this gives the
    // sender's client a chance to show "sent" state, and keeps ordering
    // consistent.
    io.to(roomOf(convoy.id)).emit(EVENTS.PTT_CLIP, clip);
  });
}
