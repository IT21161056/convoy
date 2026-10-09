import { convoyStore } from "@/features/convoy";
import { emit } from "@/services/socket";
import { EVENTS, type PttBroadcastPayload } from "@/services/socket/events";

const MAX_DURATION_MS = 30_000;

export const pttCommands = {
  broadcast(audioBase64: string, durationMs: number) {
    const convoy = convoyStore.getState();
    if (!convoy) return;
    if (durationMs <= 0 || durationMs > MAX_DURATION_MS) return;
    if (!audioBase64) return;

    const payload: PttBroadcastPayload = {
      convoyId: convoy.id,
      memberId: convoy.selfId,
      audioBase64,
      durationMs,
    };
    emit(EVENTS.PTT_BROADCAST, payload);
  },
};
