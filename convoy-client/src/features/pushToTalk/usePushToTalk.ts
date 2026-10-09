import {
  AudioModule,
  RecordingPresets,
  useAudioPlayer,
  useAudioRecorder,
} from "expo-audio";
import { File } from "expo-file-system";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PttRecording, PttState } from "./types";

const MIN_DURATION_MS = 500;

interface UsePushToTalkResult {
  state: PttState;
  durationMs: number;
  hasPermission: boolean | null;
  lastRecording: PttRecording | null;
  lastError: string | null;
  requestPermission: () => Promise<boolean>;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  /** Play back the last recording (dev affordance until socket lands). */
  playLast: () => Promise<void>;
  /** Clear the last recording. */
  clear: () => void;
  getLastRecordingBase64: () => Promise<string | null>;
}

export function usePushToTalk(): UsePushToTalkResult {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const player = useAudioPlayer();

  const [state, setState] = useState<PttState>("idle");
  const [durationMs, setDurationMs] = useState(0);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [lastRecording, setLastRecording] = useState<PttRecording | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  const startedAtRef = useRef<number | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ---- ask once on mount (does not prompt) ----
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await AudioModule.getRecordingPermissionsAsync();
      if (!cancelled) setHasPermission(res.granted);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ---- cleanup ----
  useEffect(() => {
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      if (recorder.isRecording) {
        void recorder.stop().catch(() => {});
      }
    };
  }, [recorder]);

  const requestPermission = useCallback(async () => {
    const res = await AudioModule.requestRecordingPermissionsAsync();
    setHasPermission(res.granted);
    return res.granted;
  }, []);

  const start = useCallback(async () => {
    if (state === "recording") return;
    setLastError(null);

    // Permission
    if (!hasPermission) {
      const granted = await requestPermission();
      if (!granted) {
        setLastError("Microphone access is required for push-to-talk.");
        return;
      }
    }

    try {
      if (recorder.isRecording) {
        await recorder.stop().catch(() => {});
      }
      await recorder.prepareToRecordAsync();
      recorder.record();

      startedAtRef.current = Date.now();
      setDurationMs(0);
      setState("recording");

      tickRef.current = setInterval(() => {
        if (startedAtRef.current) {
          setDurationMs(Date.now() - startedAtRef.current);
        }
      }, 100);
    } catch (err) {
      setLastError("Could not start recording.");
      setState("idle");
      console.warn("[ptt] start failed", err);
    }
  }, [state, hasPermission, requestPermission, recorder]);

  const stop = useCallback(async () => {
    if (state !== "recording") return;

    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }

    const startedAt = startedAtRef.current ?? Date.now();
    const elapsed = Date.now() - startedAt;
    startedAtRef.current = null;

    try {
      await recorder.stop();
    } catch (err) {
      console.warn("[ptt] stop failed", err);
    }

    setState("idle");
    setDurationMs(0);

    // Discard too-short recordings
    if (elapsed < MIN_DURATION_MS) {
      setLastError(null);
      return;
    }

    const uri = recorder.uri;
    if (!uri) {
      setLastError("Recording produced no file.");
      return;
    }

    setLastRecording({
      uri,
      durationMs: elapsed,
      recordedAt: Date.now(),
    });
    setState("ready");
  }, [state, recorder]);

  const playLast = useCallback(async () => {
    if (!lastRecording) return;
    try {
      player.replace({ uri: lastRecording.uri });
      player.play();
    } catch (err) {
      console.warn("[ptt] playback failed", err);
    }
  }, [lastRecording, player]);

  const clear = useCallback(() => {
    setLastRecording(null);
    setState("idle");
    setDurationMs(0);
    setLastError(null);
  }, []);

  const getLastRecordingBase64 = useCallback(async (): Promise<
    string | null
  > => {
    if (!lastRecording) return null;
    try {
      const file = new File(lastRecording.uri);
      const b64 = await file.base64();
      return b64;
    } catch (err) {
      console.warn("[ptt] failed to read recording", err);
      return null;
    }
  }, [lastRecording]);

  return {
    state,
    durationMs,
    hasPermission,
    lastRecording,
    lastError,
    getLastRecordingBase64,
    requestPermission,
    start,
    stop,
    playLast,
    clear,
  };
}
