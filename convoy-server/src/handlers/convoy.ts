import type { Server, Socket } from "socket.io";
import { nanoid } from "nanoid";
import {
  EVENTS,
  type ConvoyRejoinPayload,
  type ConvoySnapshot,
  type CreateConvoyPayload,
  type JoinConvoyPayload,
  type LeaveConvoyPayload,
  type MemberSnapshot,
  type SyncRequestPayload,
  type SyncReplyPayload,
  type MemberLocationSnapshot,
} from "../types";
import {
  convoys,
  createConvoy,
  findConvoyByCode,
  socketToMember,
  toSnapshot,
  touch,
} from "../state";

function roomOf(convoyId: string) {
  return `convoy:${convoyId}`;
}

function broadcastSnapshot(io: Server, convoyId: string) {
  const convoy = convoys.get(convoyId);
  if (!convoy) return;
  io.to(roomOf(convoyId)).emit(EVENTS.CONVOY_SNAPSHOT, toSnapshot(convoy));
}

function broadcastMemberJoined(
  io: Server,
  convoyId: string,
  member: MemberSnapshot,
) {
  io.to(roomOf(convoyId)).emit(EVENTS.MEMBER_JOINED, member);
}

function broadcastMemberLeft(io: Server, convoyId: string, memberId: string) {
  io.to(roomOf(convoyId)).emit(EVENTS.MEMBER_LEFT, { memberId });
}

export function registerConvoy(socket: Socket, io: Server) {
  // ---------------- create ----------------
  socket.on(EVENTS.CONVOY_CREATE, (payload: CreateConvoyPayload) => {
    console.log(
      `[create] host=${payload.memberId.slice(0, 8)} name=${payload.hostName} convoy=${payload.convoyName}`,
    );

    const host: MemberSnapshot = {
      id: payload.memberId,
      name: payload.hostName,
      isHost: true,
      status: "connected",
      lastSeenAt: new Date().toISOString(),
    };

    const code = makeCode();
    const convoy = createConvoy(payload.convoyName, code, host);

    console.log(
      `[create] assigned code=${convoy.code} id=${convoy.id.slice(-6)}`,
    );

    convoy.sockets.set(socket.id, host.id);
    socketToMember.set(socket.id, { convoyId: convoy.id, memberId: host.id });
    socket.join(roomOf(convoy.id));

    socket.emit(EVENTS.CONVOY_SNAPSHOT, toSnapshot(convoy));
    touch();
  });

  // ---------------- join ----------------
  socket.on(EVENTS.CONVOY_JOIN, (payload: JoinConvoyPayload) => {
    console.log(
      `[join] received: name=${payload.memberName} code=${payload.code} memberId=${payload.memberId.slice(0, 8)}`,
    );

    const convoy = findConvoyByCode(payload.code.toUpperCase());
    if (!convoy) {
      console.log(
        `[join] NOT FOUND: code=${payload.code} — known codes: ${[...convoys.values()].map((c) => c.code).join(", ")}`,
      );
      socket.emit(EVENTS.ERROR, {
        code: "CONVOY_NOT_FOUND",
        message: "Convoy not found. Check the code and try again.",
      });
      return;
    }

    console.log(
      `[join] found: convoy=${convoy.id.slice(-6)} members_before=${convoy.members.length}`,
    );

    // If this memberId is already in the convoy, reuse it (reconnect case).
    const existing = convoy.members.find((m) => m.id === payload.memberId);
    const member: MemberSnapshot = existing ?? {
      id: payload.memberId,
      name: payload.memberName,
      isHost: false,
      status: "connected",
      lastSeenAt: new Date().toISOString(),
    };

    if (!existing) {
      convoy.members.push(member);
    } else {
      existing.status = "connected";
      existing.lastSeenAt = new Date().toISOString();
    }

    // If this socket was previously in a different convoy, leave that room
    const prevRef = socketToMember.get(socket.id);
    if (prevRef && prevRef.convoyId !== convoy.id) {
      const prevConvoy = convoys.get(prevRef.convoyId);
      if (prevConvoy) {
        prevConvoy.sockets.delete(socket.id);
        socket.leave(roomOf(prevConvoy.id));
      }
    }

    convoy.sockets.set(socket.id, member.id);
    socketToMember.set(socket.id, { convoyId: convoy.id, memberId: member.id });
    socket.join(roomOf(convoy.id));

    // Send the full snapshot to the joiner, then notify everyone else.
    socket.emit(EVENTS.CONVOY_SNAPSHOT, toSnapshot(convoy));
    console.log(`[join] snapshot sent: members_after=${convoy.members.length}`);
    broadcastMemberJoined(io, convoy.id, member);
    broadcastSnapshot(io, convoy.id);
    touch();
  });

  // ---------------- rejoin ----------------
  socket.on(EVENTS.CONVOY_REJOIN, (payload: ConvoyRejoinPayload) => {
    console.log(
      `[rejoin] memberId=${payload.memberId.slice(0, 8)} convoyId=${payload.convoyId}`,
    );

    const convoy = convoys.get(payload.convoyId);
    if (!convoy) {
      console.log(`[rejoin] NOT FOUND: convoy=${payload.convoyId}`);
      socket.emit(EVENTS.ERROR, {
        code: "CONVOY_NOT_FOUND",
        message: "Convoy no longer exists or has ended.",
      });
      return;
    }

    const member = convoy.members.find((m) => m.id === payload.memberId);
    if (!member) {
      console.log(`[rejoin] NOT A MEMBER: memberId=${payload.memberId}`);
      socket.emit(EVENTS.ERROR, {
        code: "NOT_A_MEMBER",
        message: "You are not a member of this convoy.",
      });
      return;
    }

    // Associate new socket with member and convoy
    convoy.sockets.set(socket.id, member.id);
    socketToMember.set(socket.id, { convoyId: convoy.id, memberId: member.id });
    socket.join(roomOf(convoy.id));

    member.status = "connected";
    member.lastSeenAt = new Date().toISOString();

    // Send full snapshot directly to the reconnected socket
    socket.emit(EVENTS.CONVOY_SNAPSHOT, toSnapshot(convoy));

    // Notify other members of updated status
    broadcastSnapshot(io, convoy.id);
    touch();
  });

  // ---------------- start ----------------
  socket.on(EVENTS.CONVOY_START, () => {
    const ref = socketToMember.get(socket.id);
    if (!ref) return;
    const convoy = convoys.get(ref.convoyId);
    if (!convoy) return;
    if (convoy.hostId !== ref.memberId) {
      socket.emit(EVENTS.ERROR, {
        code: "NOT_HOST",
        message: "Only the host can start the convoy.",
      });
      return;
    }
    convoy.phase = "active";
    broadcastSnapshot(io, convoy.id);
    touch();
  });

  // ---------------- leave (explicit) ----------------
  socket.on(EVENTS.CONVOY_LEAVE, (_payload: LeaveConvoyPayload) => {
    handleExplicitLeave(socket, io);
  });

  socket.on(EVENTS.CONVOY_END, () => {
    const ref = socketToMember.get(socket.id);
    if (!ref) return;
    const convoy = convoys.get(ref.convoyId);
    if (!convoy) return;

    // Only the host can end the convoy.
    if (convoy.hostId !== ref.memberId) {
      socket.emit(EVENTS.ERROR, {
        code: "NOT_HOST",
        message: "Only the host can end the convoy.",
      });
      return;
    }

    convoy.phase = "ended";
    touch();

    // Notify everyone — including the host.
    io.to(roomOf(convoy.id)).emit(EVENTS.CONVOY_ENDED, {
      reason: "host_ended",
    });

    // Then tear down the convoy after a small delay to let clients process
    // the event. Sockets auto-leave when disconnected, but this makes it
    // explicit.
    setTimeout(() => {
      for (const sid of convoy.sockets.keys()) {
        const s = io.sockets.sockets.get(sid);
        s?.leave(roomOf(convoy.id));
      }
      convoys.delete(convoy.id);
      touch();
    }, 2000);
  });

  // ---------------- rename ----------------
  socket.on(
    EVENTS.CONVOY_RENAME,
    (payload: { convoyId: string; memberId: string; name: string }) => {
      const ref = socketToMember.get(socket.id);
      if (!ref || ref.memberId !== payload.memberId) return;

      const convoy = convoys.get(ref.convoyId);
      if (!convoy) return;

      if (convoy.hostId !== ref.memberId) {
        socket.emit(EVENTS.ERROR, {
          code: "NOT_HOST",
          message: "Only the host can rename the convoy.",
        });
        return;
      }

      const trimmed = payload.name?.trim();
      if (!trimmed) return;

      convoy.name = trimmed;
      touch();
      broadcastSnapshot(io, convoy.id);
    },
  );

  // ---------------- sync (delta resynchronization, DESIGN.md §14.3) ----------------
  socket.on(
    EVENTS.SYNC,
    (
      payload: SyncRequestPayload,
      callback?: (reply: SyncReplyPayload) => void,
    ) => {
      console.log(
        `[sync] request from member=${payload.memberId.slice(0, 8)} convoy=${payload.convoyId.slice(-6)} lastSeq=${payload.lastSeq}`,
      );

      const convoy = convoys.get(payload.convoyId);
      if (!convoy) {
        socket.emit(EVENTS.ERROR, {
          code: "CONVOY_NOT_FOUND",
          message: "Convoy not found.",
        });
        return;
      }

      const member = convoy.members.find((m) => m.id === payload.memberId);
      if (!member) {
        socket.emit(EVENTS.ERROR, {
          code: "NOT_A_MEMBER",
          message: "You are not a member of this convoy.",
        });
        return;
      }

      // Filter events/messages missed after lastSeq
      const missedMessages = convoy.messages.filter(
        (m) => m.seq !== undefined && m.seq > payload.lastSeq,
      );

      // Latest location snapshot for every member
      const latestLocations: MemberLocationSnapshot[] = convoy.members.map(
        (m) => ({
          memberId: m.id,
          lat: m.location?.lat ?? null,
          lng: m.location?.lng ?? null,
          heading: m.location?.heading ?? null,
          speed: m.location?.speed ?? null,
          timestamp: m.location?.timestamp ?? Date.now(),
        }),
      );

      const reply: SyncReplyPayload = {
        convoyId: convoy.id,
        currentSeq: convoy.seq,
        messages: missedMessages,
        locations: latestLocations,
        members: convoy.members,
      };

      if (typeof callback === "function") {
        callback(reply);
      }
      socket.emit(EVENTS.SYNC_REPLY, reply);
    },
  );

  socket.on("disconnect", () => {
    handleSocketDisconnect(socket, io);
  });
}

/**
 * Called when a socket disconnects unexpectedly (network drop, backgrounding, etc).
 * Per spec §28, does NOT delete the member or hand over host; marks member offline.
 */
function handleSocketDisconnect(socket: Socket, io: Server) {
  const ref = socketToMember.get(socket.id);
  if (!ref) return;

  const convoy = convoys.get(ref.convoyId);
  socketToMember.delete(socket.id);
  if (convoy) {
    convoy.sockets.delete(socket.id);
  }

  // Give a 4-second grace period before marking offline to avoid flickering during quick reconnects
  setTimeout(() => {
    const currentConvoy = convoys.get(ref.convoyId);
    if (!currentConvoy) return;
    const stillConnected = [...currentConvoy.sockets.values()].includes(ref.memberId);
    if (stillConnected) return;

    const member = currentConvoy.members.find((m) => m.id === ref.memberId);
    if (member && member.status !== "offline") {
      member.status = "offline";
      console.log(`[disconnect] member ${member.name} (${ref.memberId.slice(0, 8)}) is now offline`);

      broadcastSnapshot(io, currentConvoy.id);
      touch();
    }
  }, 4000);
}

/**
 * Called when a user explicitly chooses to leave the convoy (spec §30).
 */
function handleExplicitLeave(socket: Socket, io: Server) {
  const ref = socketToMember.get(socket.id);
  if (!ref) return;

  const convoy = convoys.get(ref.convoyId);
  socketToMember.delete(socket.id);

  if (!convoy) return;

  convoy.sockets.delete(socket.id);
  socket.leave(roomOf(convoy.id));

  // Only remove member record if no other socket exists
  const stillConnected = [...convoy.sockets.values()].includes(ref.memberId);
  if (stillConnected) {
    broadcastSnapshot(io, convoy.id);
    return;
  }

  convoy.members = convoy.members.filter((m) => m.id !== ref.memberId);

  if (convoy.members.length === 0) {
    // Last member left — clean up the convoy entirely.
    convoys.delete(convoy.id);
    touch();
    return;
  }

  broadcastMemberLeft(io, convoy.id, ref.memberId);

  // If the host intentionally left, promote next member so convoy isn't orphaned
  if (convoy.hostId === ref.memberId && convoy.members.length > 0) {
    const next = convoy.members[0];
    next.isHost = true;
    convoy.hostId = next.id;
  }

  broadcastSnapshot(io, convoy.id);
  touch();
}

function makeCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (let attempt = 0; attempt < 5; attempt++) {
    let out = "";
    for (let i = 0; i < 5; i++) {
      out += chars[Math.floor(Math.random() * chars.length)];
    }
    if (!findConvoyByCode(out)) return out;
  }
  return `C${nanoid(4)}`;
}
