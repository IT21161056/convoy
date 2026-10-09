// Mirrors convoy-server/src/types.ts — keep in sync.
// In a real monorepo, this would be a shared package.

export const EVENTS = {
  // client → server
  CONVOY_CREATE: "convoy:create",
  CONVOY_JOIN: "convoy:join",
  CONVOY_REJOIN: "convoy:rejoin",
  CONVOY_RENAME: "convoy:rename",
  CONVOY_LEAVE: "convoy:leave",
  CONVOY_START: "convoy:start",
  CONVOY_END: "convoy:end",
  LOCATION_UPDATE: "location:update",
  LOCATION_CLEAR: "location:clear",
  CHAT_SEND: "chat:send",
  PTT_BROADCAST: "ptt:broadcast",
  SETTINGS_UPDATE: "settings:update",
  SYNC: "sync",

  // server → client
  CONVOY_SNAPSHOT: "convoy:snapshot",
  CONVOY_UPDATED: "convoy:updated",
  CONVOY_ENDED: "convoy:ended",
  MEMBER_JOINED: "member:joined",
  MEMBER_LEFT: "member:left",
  MEMBER_LOCATION: "member:location",
  CHAT_MESSAGE: "chat:message",
  PTT_CLIP: "ptt:clip",
  SETTINGS_STATE: "settings:state",
  SYNC_REPLY: "sync:reply",
  ERROR: "error:message",

  HELLO: "hello",
  HELLO_ACK: "hello:ack",
} as const;

// ---- Client → Server ----
export interface CreateConvoyPayload {
  convoyName: string;
  hostName: string;
  memberId: string;
}

export interface JoinConvoyPayload {
  code: string;
  memberName: string;
  memberId: string;
}

export interface ConvoyRejoinPayload {
  convoyId: string;
  memberId: string;
}

export interface ConvoyRenamePayload {
  convoyId: string;
  memberId: string;
  name: string;
}

export interface LocationClearPayload {
  convoyId: string;
  memberId: string;
}

export interface LeaveConvoyPayload {
  convoyId: string;
  memberId: string;
}

export interface LocationUpdatePayload {
  convoyId: string;
  memberId: string;
  lat: number;
  lng: number;
  heading: number | null;
  speed: number | null;
  timestamp: number;
}

export interface ChatSendPayload {
  convoyId: string;
  memberId: string;
  text: string;
  clientId?: string;
}

export interface ChatSendAck {
  ok: boolean;
  clientId?: string;
  seq: number;
  id: string;
}

export interface SyncRequestPayload {
  convoyId: string;
  memberId: string;
  lastSeq: number;
}

export interface PttBroadcastPayload {
  convoyId: string;
  memberId: string;
  audioBase64: string;
  durationMs: number;
}

export interface SettingsUpdatePayload {
  convoyId: string;
  memberId: string;
  patch: Partial<ConvoySettingsSnapshot>;
}

// ---- Server → Client ----
export interface ConvoySettingsSnapshot {
  locationSharing: boolean;
  membersCanPtt: boolean;
  membersCanChat: boolean;
  membersCanInvite: boolean;
}

export interface MemberSnapshot {
  id: string;
  name: string;
  isHost: boolean;
  status: "connected" | "stale" | "offline";
  lastSeenAt?: string;
  location?: {
    lat: number;
    lng: number;
    heading: number | null;
    speed: number | null;
    timestamp: number;
  };
}

export interface ConvoySnapshot {
  id: string;
  name: string;
  code: string;
  hostId: string;
  phase: "lobby" | "active" | "ended";
  seq?: number;
  members: MemberSnapshot[];
  settings?: ConvoySettingsSnapshot;
}

export interface ChatMessageSnapshot {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  sentAt: string;
  clientId?: string;
  seq?: number;
}

export interface PttClipSnapshot {
  id: string;
  senderId: string;
  senderName: string;
  audioBase64: string;
  durationMs: number;
  sentAt: string;
}

export interface MemberLocationSnapshot {
  memberId: string;
  lat: number | null;
  lng: number | null;
  heading: number | null;
  speed: number | null;
  timestamp: number;
}

export interface SyncReplyPayload {
  convoyId: string;
  currentSeq: number;
  messages: ChatMessageSnapshot[];
  locations: MemberLocationSnapshot[];
  members: MemberSnapshot[];
}

