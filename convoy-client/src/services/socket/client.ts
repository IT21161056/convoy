import { io, Socket } from "socket.io-client";
import { SOCKET_URL } from "./config";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    socket.on("connect", () => {
      console.log(`[socket] connected ${socket?.id} → ${SOCKET_URL}`);
    });
    socket.on("disconnect", (reason) => {
      console.log(`[socket] disconnected: ${reason}`);
    });
    socket.on("connect_error", (err) => {
      console.warn(`[socket] connect_error: ${err.message}`);
    });
  }
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

/** Low-level typed emit. */
export function emit<T>(event: string, payload?: T) {
  const s = getSocket();
  if (!s.connected) {
    if (event !== "location:update") {
      console.warn(`[socket] emit before connect: ${event}`);
    }
  }
  s.emit(event, payload);
}

/** Subscribe. Returns an unsubscribe function. */
export function on<T>(event: string, handler: (payload: T) => void) {
  const s = getSocket();
  s.on(event, handler);
  return () => {
    s.off(event, handler);
  };
}
