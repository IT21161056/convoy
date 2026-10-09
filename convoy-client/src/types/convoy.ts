import type { Member } from "./member";

export type ConvoyPhase = "lobby" | "active" | "ended";

export interface ConvoySettings {
  /** Whether the current user shares their location to the convoy. */
  locationSharing: boolean;

  // --- Member permissions (host-controlled) ---

  /** Whether non-host members can send PTT broadcasts. */
  membersCanPtt: boolean;

  /** Whether non-host members can send chat messages. */
  membersCanChat: boolean;

  /** Whether non-host members can invite others via code/QR. */
  membersCanInvite: boolean;
}

export interface Convoy {
  id: string;
  name: string;
  code: string;
  hostId: string;
  /** The local user's member id in this convoy. */
  selfId: string;
  phase: ConvoyPhase;
  members: Member[];
  settings: ConvoySettings;
}

export interface SettingsUpdatePayload {
  convoyId: string;
  memberId: string;
  patch: Partial<ConvoySettingsSnapshot>;
}

export interface ConvoySettingsSnapshot {
  locationSharing: boolean;
  membersCanPtt: boolean;
  membersCanChat: boolean;
  membersCanInvite: boolean;
}
