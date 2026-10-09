export type MemberStatus =
  | "connected" // active connection
  | "live" // < 10s fresh GPS fix
  | "delayed" // 10s - 30s delay
  | "stale" // 30s - 120s stale fix
  | "lost" // > 120s lost signal
  | "offline"; // socket disconnected

export interface MemberLocation {
  lat: number;
  lng: number;
  heading: number | null;
  speed: number | null;
  timestamp: number;
}

export interface Member {
  id: string;
  name: string;
  isHost: boolean;
  status: MemberStatus;
  lastSeenAt?: string;
  location?: MemberLocation;
}
