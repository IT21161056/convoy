import { convoyStore } from "@/features/convoy";
import { on } from "@/services/socket";
import { EVENTS, type PttClipSnapshot } from "@/services/socket/events";
import { createAudioPlayer, type AudioPlayer } from "expo-audio";
import { File, Paths } from "expo-file-system";
import { createStore } from "@/utils/store";
import { useEffect, useRef, useSyncExternalStore } from "react";

// ---------------------------------------------------------------------------
// Speaker state — "Kasun is talking…" indicator
// ---------------------------------------------------------------------------

interface PttSpeaker {
  memberId: string;
  name: string;
  until: number;
}

const speakerStore = createStore<PttSpeaker | null>(null);

function setSpeaker(next: PttSpeaker | null) {
  speakerStore.setState(next);
}

export function usePttSpeaker() {
  return useSyncExternalStore(
    speakerStore.subscribe,
    speakerStore.getSnapshot,
    speakerStore.getSnapshot,
  );
}

// ---------------------------------------------------------------------------
// Playback (serialized)
// ---------------------------------------------------------------------------

let currentPlayer: AudioPlayer | null = null;

async function playClip(
  audioBase64: string,
  durationMs: number,
  sender: { memberId: string; name: string },
) {
  // Wait for any current playback to finish.
  while (currentPlayer) {
    await new Promise((r) => setTimeout(r, 100));
  }

  // Show the "speaking" badge for the duration of the clip.
  setSpeaker({
    memberId: sender.memberId,
    name: sender.name,
    until: Date.now() + durationMs,
  });

  let tmpFile: File | null = null;

  try {
    tmpFile = new File(Paths.cache, `ptt_${Date.now()}.m4a`);
    // The new expo-file-system File API expects a Uint8Array or a
    // base64 string. `write` with a plain string writes UTF-8 by default.
    // Passing `{ encoding: "base64" }` is supported in recent SDKs; if
    // your version rejects it, decode the base64 to bytes first.
    tmpFile.write(audioBase64, { encoding: "base64" });

    const player = createAudioPlayer({ uri: tmpFile.uri });
    currentPlayer = player;

    player.play();

    // Wait for the clip to finish. Using the known duration is reliable
    // across expo-audio versions, since not all versions expose a
    // playback-ended event. Add a small buffer to avoid cutting off.
    await new Promise<void>((resolve) => setTimeout(resolve, durationMs + 300));
  } catch (err) {
    console.warn("[ptt] playback failed", err);
  } finally {
    // Best-effort cleanup
    try {
      tmpFile?.delete();
    } catch {
      // ignore
    }

    currentPlayer = null;
    setSpeaker(null);
  }
}

// ---------------------------------------------------------------------------
// Sync hook
// ---------------------------------------------------------------------------

export function usePttSync() {
  const queueRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    const off = on<PttClipSnapshot>(EVENTS.PTT_CLIP, (clip) => {
      const current = convoyStore.getState();
      if (!current) return;

      // Don't play your own clip back.
      if (clip.senderId === current.selfId) return;

      // Serialize playback: chain each clip onto the previous one.
      queueRef.current = queueRef.current.then(() =>
        playClip(clip.audioBase64, clip.durationMs, {
          memberId: clip.senderId,
          name: clip.senderName,
        }),
      );
    });
    return off;
  }, []);
}
