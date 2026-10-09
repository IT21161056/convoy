import { convoyCommands, convoyStore } from "@/features/convoy";
import { getSocket } from "@/services/socket";
import { deltaSync, outboxSync } from "@/services/sync";
import { useEffect } from "react";
import { connectionStore } from "./useConnectionState";

/**
 * Mount once at the root layout. Connects the socket and mirrors its
 * connection state into connectionStore for the UI.
 * Automatically rejoins the server session for an active convoy on connect/reconnect.
 * Automatically flushes the offline outbox and triggers delta sync (DESIGN.md §14.3).
 */
export function useSocketLifecycle() {
  useEffect(() => {
    const socket = getSocket();
    outboxSync.init();
    deltaSync.init();

    const tryRejoinAndSync = async () => {
      if (!convoyStore.isHydrated()) {
        await convoyStore.hydrate();
      }
      const current = convoyStore.getState();
      if (current && current.id && current.phase !== "ended") {
        try {
          await convoyCommands.rejoin(current.id);
          // Step 2 & 4: Flush outbox then request delta sync
          await outboxSync.flush();
          await deltaSync.requestSync(current.id, current.selfId);
        } catch (err: any) {
          console.warn("[lifecycle] auto-rejoin/sync failed:", err?.message);
        }
      }
    };

    const onConnect = () => {
      connectionStore.set("connected");
      void tryRejoinAndSync();
    };
    const onDisconnect = () => connectionStore.set("offline");
    const onReconnectAttempt = () => connectionStore.set("reconnecting");
    const onError = () => connectionStore.set("offline");

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.io.on("reconnect_attempt", onReconnectAttempt);
    socket.on("connect_error", onError);

    // Reflect current state in case we mounted after connection.
    if (socket.connected) {
      connectionStore.set("connected");
      void tryRejoinAndSync();
    }

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.io.off("reconnect_attempt", onReconnectAttempt);
      socket.off("connect_error", onError);
    };
  }, []);
}
