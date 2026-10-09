import {
  ADAPTIVE_SAMPLING,
  MEMBER_STATUS_THRESHOLDS,
  RECONNECT_BACKOFF,
  type DerivedMemberStatus,
} from "./constants";

export interface LatLng {
  latitude: number;
  longitude: number;
}

const EARTH_RADIUS_M = 6371000;

/** Great-circle distance in metres using the Haversine formula (DESIGN.md §15.5). */
export function distanceMeters(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

/** Initial bearing from a → b, in degrees (0–360, 0 = north, clockwise). */
export function bearingDegrees(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;

  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const dLon = toRad(b.longitude - a.longitude);

  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/** Shortest signed delta between two bearings, -180..180 degrees. */
export function bearingDelta(a: number, b: number): number {
  let d = b - a;
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  return d;
}

// ============================================================================
// Vector Dot Product Projection: "Ahead / Behind" (DESIGN.md §15.5)
// ============================================================================

export interface AheadBehindProjection {
  distanceMeters: number;
  /** Longitudinal projection along vehicle heading: positive = ahead, negative = behind */
  projectionMeters: number;
  /** Lateral cross-track offset: positive = right, negative = left */
  lateralMeters: number;
  isAhead: boolean;
  isBehind: boolean;
  label: string;
}

/**
 * Projects the displacement vector between self and other member onto the
 * reference member's travel heading via dot product (DESIGN.md §15.5).
 *
 * Mathematical derivation:
 *   Let unit heading vector u = (sin θ, cos θ) [x=East, y=North]
 *   Displacement vector d has magnitude `distance` and angle `bearing`
 *   Longitudinal projection P = d · u = distance * cos(bearing - heading)
 *   Lateral offset L = distance * sin(bearing - heading)
 */
export function projectVectorOntoHeading(
  self: LatLng,
  other: LatLng,
  headingDeg: number | null,
): AheadBehindProjection {
  const dist = distanceMeters(self, other);

  if (dist < 30) {
    return {
      distanceMeters: dist,
      projectionMeters: 0,
      lateralMeters: 0,
      isAhead: false,
      isBehind: false,
      label: "near you",
    };
  }

  const formattedDist = formatDistance(dist);

  if (headingDeg == null || isNaN(headingDeg)) {
    return {
      distanceMeters: dist,
      projectionMeters: 0,
      lateralMeters: 0,
      isAhead: false,
      isBehind: false,
      label: `${formattedDist} away`,
    };
  }

  const bearing = bearingDegrees(self, other);
  const deltaDeg = bearingDelta(headingDeg, bearing);
  const deltaRad = (deltaDeg * Math.PI) / 180;

  // Dot product projection: P = distance * cos(bearing - heading)
  const projection = dist * Math.cos(deltaRad);
  // Cross product lateral offset: L = distance * sin(bearing - heading)
  const lateral = dist * Math.sin(deltaRad);

  const isAhead = projection > 0;
  const isBehind = projection < 0;

  let label: string;
  const absDelta = Math.abs(deltaDeg);
  if (absDelta <= 60) {
    label = `${formattedDist} ahead`;
  } else if (absDelta >= 120) {
    label = `${formattedDist} behind`;
  } else {
    label = deltaDeg > 0 ? `${formattedDist} to your right` : `${formattedDist} to your left`;
  }

  return {
    distanceMeters: dist,
    projectionMeters: Math.round(projection),
    lateralMeters: Math.round(lateral),
    isAhead,
    isBehind,
    label,
  };
}

/**
 * Human-readable relative position, per DESIGN.md §13.5:
 *   "350 m ahead"  /  "1.2 km behind"  /  "near you"
 */
export function relativePosition(
  self: LatLng,
  member: LatLng,
  selfHeadingDeg: number | null,
): string {
  return projectVectorOntoHeading(self, member, selfHeadingDeg).label;
}

/** Formats metres into human-readable text: 350 m / 1.2 km. */
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  const km = meters / 1000;
  return `${km.toFixed(km < 10 ? 1 : 0)} km`;
}

/** Converts heading degrees into cardinal direction string, e.g. "NE 45°". */
export function headingToCardinal(degrees: number | null): string {
  if (degrees == null || isNaN(degrees)) return "";
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const index = Math.round((((degrees % 360) + 360) % 360) / 45) % 8;
  return `${directions[index]} ${Math.round(degrees)}°`;
}

/** Formats metres per second into km/h. */
export function formatSpeedKmh(mps: number | null): string {
  if (mps == null || isNaN(mps) || mps < 0.5) return "0 km/h";
  const kmh = Math.round(mps * 3.6);
  return `${kmh} km/h`;
}

// ============================================================================
// Convoy Order along Trajectory (DESIGN.md §15.5)
// ============================================================================

/**
 * Orders convoy members sequentially along the convoy travel vector:
 * 1. If leader heading is known, projects all members along that heading vector
 *    and sorts from front of convoy to rear.
 * 2. If heading is unknown or unavailable, falls back to nearest-neighbour chaining
 *    from host so the road line stays continuous and clean.
 */
export function orderMembersAlongConvoy<T extends { id: string; isHost?: boolean }>(
  members: T[],
  positions: Record<string, LatLng>,
  leaderHeadingDeg?: number | null,
): T[] {
  const valid = members.filter((m) => positions[m.id]);
  if (valid.length <= 2) return valid;

  // Locate the host/leader as origin reference
  const hostIdx = valid.findIndex((m) => m.isHost);
  const leader = hostIdx >= 0 ? valid[hostIdx] : valid[0];
  const leaderPos = positions[leader.id];

  // If leader heading is provided, project onto trajectory vector
  if (leaderHeadingDeg != null && !isNaN(leaderHeadingDeg)) {
    const headingRad = (leaderHeadingDeg * Math.PI) / 180;
    const uX = Math.sin(headingRad);
    const uY = Math.cos(headingRad);

    const scored = valid.map((member) => {
      const pos = positions[member.id];
      const dist = distanceMeters(leaderPos, pos);
      if (dist === 0) return { member, score: 0 };

      const bearing = (bearingDegrees(leaderPos, pos) * Math.PI) / 180;
      // Projection = displacement · unit_heading
      const proj = dist * (Math.sin(bearing) * uX + Math.cos(bearing) * uY);
      return { member, score: proj };
    });

    // Highest projection = furthest ahead at the front of convoy
    scored.sort((a, b) => b.score - a.score);
    return scored.map((s) => s.member);
  }

  // Fallback: nearest-neighbour chain starting from leader
  const unvisited = valid.filter((m) => m.id !== leader.id);
  const ordered: T[] = [leader];
  let currentPos = leaderPos;

  while (unvisited.length > 0) {
    let nearestIdx = 0;
    let minDist = Infinity;
    for (let i = 0; i < unvisited.length; i++) {
      const pos = positions[unvisited[i].id];
      const dist = distanceMeters(currentPos, pos);
      if (dist < minDist) {
        minDist = dist;
        nearestIdx = i;
      }
    }
    const [next] = unvisited.splice(nearestIdx, 1);
    ordered.push(next);
    currentPos = positions[next.id];
  }

  return ordered;
}

// ============================================================================
// Constraint Utilities: Coordinate Rounding, Stale Derivation, Backoff
// ============================================================================

/**
 * Rounds coordinate to 6 decimal places (~0.11m precision).
 * Eliminates excess payload bytes in mobile emissions (DESIGN.md §15.3).
 */
export function roundCoordinate(
  value: number,
  decimals: number = ADAPTIVE_SAMPLING.COORDINATE_DECIMALS,
): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/**
 * Derives connection freshness purely on client from `lastSeenAt` (DESIGN.md §15.6):
 *   < 10s       → live
 *   10s - 30s   → delayed
 *   30s - 120s  → stale (faded marker)
 *   > 120s      → lost
 */
export function deriveMemberStatus(
  lastSeenAt?: string | number | null,
  now: number = Date.now(),
): DerivedMemberStatus {
  if (!lastSeenAt) return "lost";

  const timestamp =
    typeof lastSeenAt === "string" ? new Date(lastSeenAt).getTime() : lastSeenAt;

  if (isNaN(timestamp)) return "lost";

  const ageMs = now - timestamp;
  if (ageMs < MEMBER_STATUS_THRESHOLDS.LIVE_MAX_MS) return "live";
  if (ageMs < MEMBER_STATUS_THRESHOLDS.DELAYED_MAX_MS) return "delayed";
  if (ageMs < MEMBER_STATUS_THRESHOLDS.STALE_MAX_MS) return "stale";
  return "lost";
}

/**
 * Calculates exponential backoff with random jitter (DESIGN.md §15.7).
 * Prevents network storming when an entire convoy reconnects simultaneously.
 */
export function calculateBackoffDelay(
  attempt: number,
  config = RECONNECT_BACKOFF,
): number {
  const baseDelay = Math.min(
    config.MAX_DELAY_MS,
    config.INITIAL_DELAY_MS * config.MULTIPLIER ** attempt,
  );
  // Apply random spread within +/- JITTER_RATIO
  const jitterRange = baseDelay * config.JITTER_RATIO;
  const jitter = (Math.random() * 2 - 1) * jitterRange;
  return Math.max(0, Math.round(baseDelay + jitter));
}

/**
 * Calculates total convoy formation span (metres) between consecutive members.
 * Pure offline calculation with zero network dependencies.
 */
export function calculateConvoySpanMeters(waypoints: LatLng[]): number {
  if (waypoints.length < 2) return 0;
  let total = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    total += distanceMeters(waypoints[i], waypoints[i + 1]);
  }
  return Math.round(total);
}