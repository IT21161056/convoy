export type PttState = "idle" | "recording" | "ready";

export interface PttRecording {
  uri: string;
  durationMs: number;
  recordedAt: number;
}
