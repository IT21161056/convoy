import { nanoid } from "nanoid";
import type {
  ConvoySnapshot,
  MemberSnapshot,
  ChatMessageSnapshot,
} from "./types";
import { saveConvoys } from "./persistence";

export interface Convoy extends ConvoySnapshot {
  /** socketId → memberId */
  sockets: Map<string, string>;
  /** Ring buffer of recent messages ordered by monotonic seq (DESIGN.md §14.3) */
  messages: ChatMessageSnapshot[];
  /** Set of recently seen clientIds to reject duplicates idempotently (DESIGN.md §14.1) */
  processedClientIds: Set<string>;
}

export const convoys = new Map<string, Convoy>();
export const socketToMember = new Map<
  string,
  { convoyId: string; memberId: string }
>();

export function createConvoy(
  name: string,
  code: string,
  host: MemberSnapshot,
): Convoy {
  const id = `convoy_${nanoid(8)}`;
  const convoy: Convoy = {
    id,
    name,
    code,
    hostId: host.id,
    phase: "lobby",
    seq: 0,
    members: [host],
    messages: [],
    processedClientIds: new Set(),
    sockets: new Map(),
    settings: {
      locationSharing: true,
      membersCanPtt: true,
      membersCanChat: true,
      membersCanInvite: true,
    },
  };
  convoys.set(id, convoy);
  return convoy;
}

export function findConvoyByCode(code: string): Convoy | undefined {
  for (const c of convoys.values()) {
    if (c.code === code) return c;
  }
  return undefined;
}

export function toSnapshot(convoy: Convoy): ConvoySnapshot {
  const {
    sockets: _sockets,
    messages: _m,
    processedClientIds: _p,
    ...snapshot
  } = convoy;
  return snapshot;
}

export function touch() {
  saveConvoys(convoys);
}
