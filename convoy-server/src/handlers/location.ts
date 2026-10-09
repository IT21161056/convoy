import type { Server, Socket } from "socket.io";
import {
  EVENTS,
  type LocationUpdatePayload,
  type MemberLocationSnapshot,
} from "../types";
import { convoys, socketToMember, touch, toSnapshot } from "../state";

// Per-socket throttle: at most 1 broadcast per second.
const lastBroadcastAt = new Map<string, number>();
const THROTTLE_MS = 1000;

interface PendingBroadcast {
  timer: NodeJS.Timeout;
  snapshot: MemberLocationSnapshot;
  convoyId: string;
}
const pendingBroadcasts = new Map<string, PendingBroadcast>();

function roomOf(convoyId: string) {
  return `convoy:${convoyId}`;
}

export function registerLocation(socket: Socket, io: Server) {
  socket.on(EVENTS.LOCATION_UPDATE, (payload: LocationUpdatePayload) => {
    console.log(
      `[loc] ${payload.memberId.slice(0, 8)} → ${payload.lat.toFixed(4)},${payload.lng.toFixed(4)}`,
    );
    let ref = socketToMember.get(socket.id);
    if (!ref && payload.convoyId && payload.memberId) {
      // Auto-recover socket mapping if socket reconnected before rejoin completed
      const convoy = convoys.get(payload.convoyId);
      if (convoy) {
        const member = convoy.members.find((m) => m.id === payload.memberId);
        if (member) {
          convoy.sockets.set(socket.id, member.id);
          socketToMember.set(socket.id, { convoyId: convoy.id, memberId: member.id });
          socket.join(roomOf(convoy.id));
          member.status = "connected";
          ref = { convoyId: convoy.id, memberId: member.id };
        }
      }
    }
    if (!ref) return;
    if (ref.memberId !== payload.memberId) return; // spoof guard

    const convoy = convoys.get(ref.convoyId);
    if (!convoy) return;

    const member = convoy.members.find((m) => m.id === payload.memberId);
    if (!member) return;

    const snapshot: MemberLocationSnapshot = {
      memberId: payload.memberId,
      lat: payload.lat,
      lng: payload.lng,
      heading: payload.heading,
      speed: payload.speed,
      timestamp: payload.timestamp,
    };

    // Update canonical state — a late joiner will see this via the snapshot.
    member.location = {
      lat: payload.lat,
      lng: payload.lng,
      heading: payload.heading,
      speed: payload.speed,
      timestamp: payload.timestamp,
    };
    member.status = "connected";
    member.lastSeenAt = new Date(payload.timestamp).toISOString();

    // Throttle the wire broadcast with trailing-edge guarantee.
    const now = Date.now();
    const last = lastBroadcastAt.get(socket.id) ?? 0;

    if (now - last < THROTTLE_MS) {
      const remaining = THROTTLE_MS - (now - last);
      const existing = pendingBroadcasts.get(socket.id);
      if (existing) {
        clearTimeout(existing.timer);
      }
      const timer = setTimeout(() => {
        pendingBroadcasts.delete(socket.id);
        lastBroadcastAt.set(socket.id, Date.now());
        socket.to(roomOf(convoy.id)).emit(EVENTS.MEMBER_LOCATION, snapshot);
      }, remaining);

      pendingBroadcasts.set(socket.id, { timer, snapshot, convoyId: convoy.id });
      return;
    }

    // Outside throttle window: cancel any pending trailing broadcast and emit immediately.
    const pending = pendingBroadcasts.get(socket.id);
    if (pending) {
      clearTimeout(pending.timer);
      pendingBroadcasts.delete(socket.id);
    }

    lastBroadcastAt.set(socket.id, now);
    socket.to(roomOf(convoy.id)).emit(EVENTS.MEMBER_LOCATION, snapshot);
  });

  socket.on(
    EVENTS.LOCATION_CLEAR,
    (payload: { convoyId: string; memberId: string }) => {
      let ref = socketToMember.get(socket.id);
      if (!ref && payload.convoyId && payload.memberId) {
        const convoy = convoys.get(payload.convoyId);
        if (convoy) {
          const member = convoy.members.find((m) => m.id === payload.memberId);
          if (member) {
            convoy.sockets.set(socket.id, member.id);
            socketToMember.set(socket.id, { convoyId: convoy.id, memberId: member.id });
            socket.join(roomOf(convoy.id));
            ref = { convoyId: convoy.id, memberId: member.id };
          }
        }
      }
      if (!ref || ref.memberId !== payload.memberId) return;

      const convoy = convoys.get(ref.convoyId);
      if (!convoy) return;

      const member = convoy.members.find((m) => m.id === payload.memberId);
      if (!member) return;

      const pending = pendingBroadcasts.get(socket.id);
      if (pending) {
        clearTimeout(pending.timer);
        pendingBroadcasts.delete(socket.id);
      }

      member.location = undefined;
      member.lastSeenAt = new Date().toISOString();
      member.status = "connected";

      io.to(roomOf(convoy.id)).emit(EVENTS.MEMBER_LOCATION, {
        memberId: payload.memberId,
        lat: null,
        lng: null,
        heading: null,
        speed: null,
        timestamp: Date.now(),
      });
      io.to(roomOf(convoy.id)).emit(EVENTS.CONVOY_SNAPSHOT, toSnapshot(convoy));
      touch();
    },
  );

  socket.on("disconnect", () => {
    lastBroadcastAt.delete(socket.id);
    const pending = pendingBroadcasts.get(socket.id);
    if (pending) {
      clearTimeout(pending.timer);
      pendingBroadcasts.delete(socket.id);
    }
  });
}
