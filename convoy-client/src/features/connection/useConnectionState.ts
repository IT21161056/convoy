import { createStore } from "@/utils/store";
import { useSyncExternalStore } from "react";

export type ConnectionState =
  | "connecting"
  | "connected"
  | "reconnecting"
  | "offline";

const store = createStore<ConnectionState>("connecting");

export const connectionStore = {
  set(next: ConnectionState) {
    store.setState(next);
  },
};

export function useConnectionState(): ConnectionState {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}

