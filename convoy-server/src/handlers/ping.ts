import type { Server, Socket } from "socket.io";
import { EVENTS } from "../types";

export function registerPing(socket: Socket, _io: Server) {
  socket.on(EVENTS.HELLO, (payload: { memberId: string }) => {
    console.log(`[socket] hello from ${payload.memberId} (${socket.id})`);
    socket.emit(EVENTS.HELLO_ACK, {
      serverTime: Date.now(),
      socketId: socket.id,
    });
  });
}
