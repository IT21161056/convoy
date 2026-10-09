import type { LatLng } from "@/utils/geo";

export type LocationPermission = "unknown" | "granted" | "denied";
export type BackgroundPermission = "unknown" | "granted" | "denied";

export type LocationServiceState =
  | "on"
  | "servicesOff"
  | "permission"
  | "unavailable";

export interface SelfLocation {
  position: LatLng;
  /** Bearing in degrees, 0–360, or null if not moving / unknown. */
  heading: number | null;
  /** Metres per second, or null if unknown. */
  speed: number | null;
  /** ms since epoch. */
  timestamp: number;
}
