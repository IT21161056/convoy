import type { Server, Socket } from "socket.io";
import {
  EVENTS,
  type SettingsUpdatePayload,
  type ConvoySettingsSnapshot,
} from "../types";
import { convoys, socketToMember, touch } from "../state";

function roomOf(convoyId: string) {
  return `convoy:${convoyId}`;
}

export function registerSettings(socket: Socket, io: Server) {
  socket.on(EVENTS.SETTINGS_UPDATE, (payload: SettingsUpdatePayload) => {
    const ref = socketToMember.get(socket.id);
    if (!ref) return;
    if (ref.memberId !== payload.memberId) return;

    const convoy = convoys.get(ref.convoyId);
    if (!convoy) return;

    // Filter out client-local privacy settings (e.g. locationSharing)
    const { locationSharing: _localOnly, ...convoyPatch } = payload.patch as any;
    if (Object.keys(convoyPatch).length === 0) return;

    // Only the host can change settings.
    if (convoy.hostId !== ref.memberId) {
      socket.emit(EVENTS.ERROR, {
        code: "NOT_HOST",
        message: "Only the host can change convoy settings.",
      });
      return;
    }

    // Apply the patch.
    convoy.settings = { ...convoy.settings, ...convoyPatch };
    touch();

    // Broadcast the full settings object so clients stay in sync.
    io.to(roomOf(convoy.id)).emit(EVENTS.SETTINGS_STATE, convoy.settings);
  });
}
