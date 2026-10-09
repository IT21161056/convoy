/**
 * Convoy Constraint Design Constants & Thresholds
 *
 * Explicit values derived from DESIGN.md (§15) and GEMINI.md (§7) for
 * battery optimization, low-data footprint, glanceable UI, and offline tolerance.
 * These values can be tuned and referenced directly during the viva defense.
 */

// ==========================================
// 1. Adaptive Location Sampling & Throttling
// ==========================================
export const ADAPTIVE_SAMPLING = {
  /** Speed boundaries in metres per second (m/s) */
  SPEED_THRESHOLDS: {
    FAST_MPS: 15, // ~54 km/h (highway/cruising)
    SLOW_MPS: 2, // ~7.2 km/h (slow traffic/walking)
  },

  /** GPS hardware sampling intervals (how often expo-location checks GPS) */
  HARDWARE_INTERVALS_MS: {
    FAST: 2000,
    SLOW: 3000,
    STATIONARY: 10000,
  },

  /** Minimum emit interval to the network based on vehicle speed */
  EMIT_INTERVALS_MS: {
    FAST: 3000, // Speed > 15 m/s: every ~3s
    SLOW: 5000, // Speed 2-15 m/s: every ~5s
    STATIONARY: 20000, // Speed < 2 m/s: every ~20s
  },

  /** Minimum distance displacement required before emitting an update (metres) */
  MIN_DISTANCE_METERS: {
    FAST: 10, // highway: 10m change needed
    SLOW: 5, // urban: 5m change needed
    STATIONARY: 3, // idle: suppress GPS jitter under 3m
  },

  /** Maximum time allowed without emit before sending a heartbeat location fix */
  HEARTBEAT_MAX_MS: {
    FAST: 6000,
    SLOW: 15000,
    STATIONARY: 45000,
  },

  /** 6 decimal places = ~0.11 m precision; prevents transmitting unnecessary floating bytes */
  COORDINATE_DECIMALS: 6,
} as const;

// ==========================================
// 2. Member Status & Lost Detection (§15.6)
// ==========================================
/**
 * Thresholds in milliseconds derived purely on the client from `lastSeenAt`.
 * Allows the UI to honestly present connection freshness without server messages.
 */
export const MEMBER_STATUS_THRESHOLDS = {
  /** Fresh update within last 30 seconds (accommodates stationary 20s adaptive sampling) */
  LIVE_MAX_MS: 30_000,
  /** Delayed update between 30s and 60s (weak cell signal or traffic slowdown) */
  DELAYED_MAX_MS: 60_000,
  /** Stale update between 60s and 180s (faded marker with "last seen" label) */
  STALE_MAX_MS: 180_000,
  /** Beyond 180 seconds: marked as lost connection */
} as const;

export type DerivedMemberStatus = "live" | "delayed" | "stale" | "lost";

// ==========================================
// 3. Exponential Backoff with Jitter (§15.7)
// ==========================================
export const RECONNECT_BACKOFF = {
  INITIAL_DELAY_MS: 1000, // start with 1s delay
  MAX_DELAY_MS: 16000, // cap at 16s to avoid perpetual silence
  MULTIPLIER: 2.0, // binary exponential growth
  JITTER_RATIO: 0.25, // +/- 25% random spread to prevent thundering herd
} as const;

// ==========================================
// 4. Memory Buffers & Voice Clip Limits (§15.8)
// ==========================================
export const BOUNDED_BUFFERS = {
  /** Maximum number of offline location trail points buffered locally */
  MAX_OFFLINE_TRAIL_POINTS: 200,
  /** Maximum cached messages in local storage per convoy */
  MAX_CHAT_HISTORY_PER_CONVOY: 500,
  /** Push-to-talk limits */
  PTT: {
    MAX_DURATION_MS: 30_000, // 30 seconds max per recording
    CLIP_TTL_MS: 60_000, // 60 seconds delivery TTL; stale audio is dropped
  },
} as const;

// ==========================================
// 5. Driver Attention & Glanceable UI (§5, §15)
// ==========================================
export const DRIVER_UI_RULES = {
  MIN_TOUCH_TARGET_DP: 48,
  MIN_DRIVING_FONT_SP: 14,
  PTT_BUTTON_SIZE_DP: 120,
} as const;
