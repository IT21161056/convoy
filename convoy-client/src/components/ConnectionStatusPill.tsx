import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { ConnectionState } from "@/features/connection";
import { colors, radii, spacing, typography } from "@/theme";

export type ConnectionStatusType =
  | ConnectionState
  | "unstable";

/**
 * ============================================================================
 * Custom Component: ConnectionStatusPill (SE5070 Requirement §8 & §17.3)
 * ============================================================================
 * Glanceable driving-console status indicator badge in the top navigation bar.
 * Translates low-level socket and network states into driver-friendly descriptions.
 *
 * PROPS:
 * - status: 'connected' | 'unstable' | 'reconnecting' | 'offline'
 * - connectedCount: Number of members currently in the active convoy room
 * - pendingCount?: Optional number of pending outbox sync items
 *
 * EVENTS:
 * - onPress?: Optional handler fired when driver taps the pill (e.g. view diagnostics)
 * ============================================================================
 */
export interface ConnectionStatusPillProps {
  status: ConnectionStatusType;
  connectedCount: number;
  pendingCount?: number;
  onPress?: () => void;
}

export function ConnectionStatusPill({
  status,
  connectedCount,
  pendingCount = 0,
  onPress,
}: ConnectionStatusPillProps) {
  const { label, color, bg } = presentStatus(status, connectedCount, pendingCount);

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.pill,
        { backgroundColor: bg, borderColor: color },
        pressed && styles.pressed,
      ]}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={`Connection status: ${label}`}
    >
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.text, { color }]}>{label}</Text>
    </Pressable>
  );
}

function presentStatus(
  status: ConnectionStatusType,
  count: number,
  pending: number,
) {
  let label: string;
  let color: string;
  let bg: string;

  switch (status) {
    case "connecting":
      label = "Connecting…";
      color = colors.primary;
      bg = "rgba(245, 166, 35, 0.12)";
      break;
    case "reconnecting":
      label = "Reconnecting…";
      color = colors.alert;
      bg = "rgba(255, 90, 95, 0.12)";
      break;
    case "unstable":
      label = "Connection unstable";
      color = colors.primary;
      bg = "rgba(245, 166, 35, 0.12)";
      break;
    case "offline":
      label = pending > 0 ? `Offline (${pending} pending)` : "Offline";
      color = colors.alert;
      bg = "rgba(255, 90, 95, 0.12)";
      break;
    case "connected":
    default:
      label =
        pending > 0
          ? `${count} connected · ${pending} sync`
          : `${count} connected`;
      color = colors.connected;
      bg = "rgba(61, 220, 151, 0.12)";
      break;
  }

  return { label, color, bg };
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radii.pill,
    borderWidth: 1,
    gap: 6,
  },
  pressed: {
    opacity: 0.75,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  text: {
    ...typography.label,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
});
