import "dotenv/config";
import { createServer } from "http";
import { Server } from "socket.io";
import { registerPing } from "./handlers/ping";
import { registerConvoy } from "./handlers/convoy";
import { EVENTS } from "./types";
import { registerLocation } from "./handlers/location";
import { toSnapshot, convoys } from "./state"; // ✅ import convoys
import { registerChat } from "./handlers/chat";
import { registerPtt } from "./handlers/ptt";
import { loadConvoys } from "./persistence";
import { registerSettings } from "./handlers/settings";
import { startNgrok } from "./tunnel";

const PORT = Number(process.env.PORT ?? 4000);

const httpServer = createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, ts: Date.now() }));
    return;
  }
  res.writeHead(404);
  res.end();
});



const io = new Server(httpServer, {
  cors: { origin: "*" }, // dev only — lock down before shipping
  pingTimeout: 60000,
  pingInterval: 25000,
});

io.on("connection", (socket) => {
  console.log(`[socket] connected ${socket.id}`);

  registerPing(socket, io);
  registerConvoy(socket, io);
  registerLocation(socket, io);
  registerChat(socket, io);
  registerPtt(socket, io);
  registerSettings(socket, io);

  socket.on("disconnect", (reason) => {
    console.log(`[socket] disconnect ${socket.id} (${reason})`);
  });

  socket.on("error", (err) => {
    console.error(`[socket] error on ${socket.id}`, err);
  });
});

loadConvoys(convoys);

httpServer.listen(PORT, async () => {
  console.log(`Convoy server listening on :${PORT}`);
  console.log(`Try: curl http://localhost:${PORT}/health`);

  if (process.env.ENABLE_NGROK !== "false") {
    await startNgrok(PORT);
  }
});

const STALE_AFTER_MS = 60_000;
const SWEEP_INTERVAL_MS = 10_000;

setInterval(() => {
  const now = Date.now();
  for (const convoy of convoys.values()) {
    let changed = false;
    for (const member of convoy.members) {
      if (member.status === "offline") continue;
      const hasActiveSocket = [...convoy.sockets.values()].includes(member.id);
      if (hasActiveSocket) {
        if (member.status !== "connected") {
          member.status = "connected";
          changed = true;
        }
        continue;
      }
      if (!member.lastSeenAt) continue;
      const age = now - new Date(member.lastSeenAt).getTime();
      const nextStatus = age > STALE_AFTER_MS ? "offline" : "stale";
      if (member.status !== nextStatus) {
        member.status = nextStatus;
        changed = true;
      }
    }
    if (changed) {
      io.to(`convoy:${convoy.id}`).emit(
        EVENTS.CONVOY_SNAPSHOT,
        toSnapshot(convoy),
      );
    }
  }
}, SWEEP_INTERVAL_MS);
