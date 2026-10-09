import React, { useEffect, useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { colors, radii, spacing, typography } from "@/theme";
import type { MemberStatus } from "@/types";
import { formatSpeedKmh, timeAgo } from "@/utils";

/**
 * ============================================================================
 * Custom Component: ConvoyMemberMarker (SE5070 Requirement §8 & §17.2)
 * ============================================================================
 * Live interactive map marker representing a convoy member on the shared road map.
 *
 * PROPS:
 * - name: Display name of the member
 * - isSelf: True if this marker represents the local authenticated driver
 * - status: Connection/freshness tier ('live' | 'delayed' | 'stale' | 'lost' | 'offline')
 * - heading?: Heading angle in degrees (0–360°), smoothly animates vehicle arrow
 * - lastSeenAt?: ISO string or timestamp of the member's last known location update
 * - speed?: Speed in m/s, formatted into glanceable km/h
 * - relativeDistance?: Calculated string (e.g. "350 m ahead", "1.2 km behind")
 * - isHost?: True if this member is the convoy leader
 *
 * EVENTS:
 * - onPress: Fired when user taps marker; opens the MemberDetailSheet
 * ============================================================================
 */
export interface ConvoyMemberMarkerProps {
  name: string;
  isSelf: boolean;
  status: MemberStatus;
  heading?: number | null;
  lastSeenAt?: number | string;
  speed?: number | null;
  relativeDistance?: string;
  isHost?: boolean;
  onPress?: () => void;
}

/**
 * Shortest-angle delta smoothing to ensure heading rotations
 * interpolate smoothly across 0°/360° boundaries without spinning backwards.
 */
function useSmoothRotation(targetDeg: number | null | undefined) {
  const rotation = useSharedValue(targetDeg ?? 0);
  const prevRef = useRef<number | null>(null);

  useEffect(() => {
    if (targetDeg == null || isNaN(targetDeg)) return;

    if (prevRef.current == null) {
      rotation.value = targetDeg;
      prevRef.current = targetDeg;
      return;
    }

    // Shortest angular difference: -180° to +180°
    const currentNorm = ((rotation.value % 360) + 360) % 360;
    let delta = targetDeg - currentNorm;
    while (delta > 180) delta -= 360;
    while (delta < -180) delta += 360;

    const nextTarget = rotation.value + delta;
    rotation.value = withTiming(nextTarget, {
      duration: 350,
      easing: Easing.out(Easing.cubic),
    });

    prevRef.current = targetDeg;
  }, [targetDeg, rotation]);

  return rotation;
}

export const ConvoyMemberMarker = React.memo(function ConvoyMemberMarker({
  name,
  isSelf,
  status,
  heading,
  lastSeenAt,
  speed,
  relativeDistance,
  isHost = false,
  onPress,
}: ConvoyMemberMarkerProps) {
  const isStale = status === "stale" || status === "delayed";
  const isLostOrOffline = status === "lost" || status === "offline";
  const isLive = status === "live" || status === "connected";

  // Color selection according to night-drive palette (DESIGN.md §5)
  const statusColor = isLostOrOffline
    ? colors.alert
    : isStale
      ? colors.primary
      : colors.connected;

  const initial = name ? name.charAt(0).toUpperCase() : "?";
  const smoothHeading = useSmoothRotation(heading);

  const headingStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${smoothHeading.value}deg` }],
  }));

  const lastSeenLabel =
    isStale && lastSeenAt ? timeAgo(lastSeenAt, Date.now()) : null;

  return (
    <Pressable
      onPress={onPress}
      style={[styles.wrapper, (isStale || isLostOrOffline) && styles.faded]}
    >
      {/* Dynamic Vehicle Compass Heading Arrow */}
      {heading != null ? (
        <Animated.View style={[styles.arrowContainer, headingStyle]}>
          <View style={[styles.arrowHead, { borderBottomColor: statusColor }]} />
        </Animated.View>
      ) : null}

      {/* Main Avatar Bubble */}
      <View
        style={[
          styles.markerBubble,
          isSelf && styles.selfBubble,
          isHost && styles.hostBubble,
          {
            borderColor: isSelf
              ? colors.primary
              : isHost
                ? colors.primary
                : statusColor,
            borderStyle: isStale || isLostOrOffline ? "dashed" : "solid",
          },
        ]}
      >
        <Text style={[styles.initialText, isSelf && styles.selfInitial]}>
          {isSelf ? "YOU" : initial}
        </Text>

        {/* Small Host Crown / Star Badge */}
        {isHost && !isSelf ? (
          <View style={styles.hostBadge}>
            <Text style={styles.hostBadgeText}>★</Text>
          </View>
        ) : null}
      </View>

      {/* Glanceable Tag Pill */}
      <View style={styles.calloutPill}>
        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
        <Text style={styles.calloutName} numberOfLines={1}>
          {isSelf ? "You" : name}
        </Text>

        {relativeDistance && !isSelf ? (
          <Text style={styles.relativeDistance}> · {relativeDistance}</Text>
        ) : null}

        {speed != null && speed > 0.5 ? (
          <Text style={styles.speedText}> · {formatSpeedKmh(speed)}</Text>
        ) : null}
      </View>

      {/* Stale "Last seen Xm ago" Subtext */}
      {lastSeenLabel ? (
        <View style={styles.staleBadge}>
          <Text style={styles.staleText}>last seen {lastSeenLabel}</Text>
        </View>
      ) : null}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  faded: {
    opacity: 0.72,
  },
  arrowContainer: {
    width: 20,
    height: 20,
    alignItems: "center",
    marginBottom: -4,
    zIndex: 1,
  },
  arrowHead: {
    width: 0,
    height: 0,
    backgroundColor: "transparent",
    borderStyle: "solid",
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 10,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
  },
  markerBubble: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.raised,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2.5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 4,
  },
  selfBubble: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    backgroundColor: colors.panel,
  },
  hostBubble: {
    borderWidth: 3,
  },
  initialText: {
    ...typography.label,
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  selfInitial: {
    fontSize: 11,
    letterSpacing: 0.8,
    fontWeight: "800",
    color: colors.primary,
  },
  hostBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  hostBadgeText: {
    color: "#000",
    fontSize: 9,
    fontWeight: "900",
  },
  calloutPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.panel,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.divider,
    marginTop: 4,
    maxWidth: 160,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  calloutName: {
    ...typography.body,
    fontSize: 12,
    color: colors.text,
    fontWeight: "600",
  },
  relativeDistance: {
    ...typography.bodyMuted,
    fontSize: 11,
    color: colors.textMuted,
  },
  speedText: {
    ...typography.bodyMuted,
    fontSize: 11,
    color: colors.connected,
  },
  staleBadge: {
    backgroundColor: "rgba(255, 90, 95, 0.15)",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    marginTop: 2,
  },
  staleText: {
    fontSize: 10,
    color: colors.alert,
    fontWeight: "500",
  },
});
