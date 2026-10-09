import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radii, spacing, typography } from "@/theme";
import { formatDistance, formatSpeedKmh, headingToCardinal } from "@/utils/geo";

interface ConvoyTelemetryHudProps {
  convoySpanMeters: number | null;
  speed: number | null;
  heading: number | null;
  distanceToHost?: number | null;
  isHost: boolean;
  memberCount: number;
}

export function ConvoyTelemetryHud({
  convoySpanMeters,
  speed,
  heading,
  distanceToHost,
  isHost,
  memberCount,
}: ConvoyTelemetryHudProps) {
  const [collapsed, setCollapsed] = useState(false);

  const speedText = formatSpeedKmh(speed);
  const headingText = headingToCardinal(heading);
  const hasSpan = convoySpanMeters != null && convoySpanMeters > 0;
  const distanceText = hasSpan ? formatDistance(convoySpanMeters) : null;

  return (
    <View style={styles.wrapper}>
      <Pressable
        onPress={() => setCollapsed((prev) => !prev)}
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      >
        {/* Main Header Row */}
        <View style={styles.topRow}>
          {/* Status Indicator */}
          <View style={styles.statusPill}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: hasSpan ? colors.connected : colors.primary },
              ]}
            />
            <Text style={styles.statusText}>
              {hasSpan ? "CONVOY CONNECTED" : "MAPPING CONVOY"}
            </Text>
          </View>

          {/* Quick Route Summary */}
          {distanceText ? (
            <View style={styles.routeMetric}>
              <Text style={styles.routeDistanceText}>{distanceText}</Text>
            </View>
          ) : null}

          {/* Collapse/Expand Chevron */}
          <Text style={styles.chevron}>{collapsed ? "▼" : "▲"}</Text>
        </View>

        {/* Expanded Telemetry Row */}
        {!collapsed ? (
          <View style={styles.telemetryRow}>
            {/* Speed & Heading */}
            <View style={styles.telemetryItem}>
              <Text style={styles.metricLabel}>SPEED / HEADING</Text>
              <Text style={styles.metricValue}>
                {speedText} {headingText ? `• ${headingText}` : ""}
              </Text>
            </View>

            {/* Gap to Leader / Role */}
            <View style={styles.telemetryItemRight}>
              <Text style={styles.metricLabel}>
                {isHost ? "ROLE" : "GAP TO LEADER"}
              </Text>
              <Text style={styles.metricValue}>
                {isHost
                  ? "👑 Convoy Leader"
                  : distanceToHost != null
                    ? formatDistance(distanceToHost)
                    : `${memberCount} active`}
              </Text>
            </View>
          </View>
        ) : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.xs,
  },
  card: {
    backgroundColor: "rgba(16, 20, 28, 0.88)",
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  cardPressed: {
    opacity: 0.85,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  statusText: {
    ...typography.label,
    fontSize: 10,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: 0.5,
  },
  routeMetric: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  routeDistanceText: {
    ...typography.body,
    fontSize: 13,
    fontWeight: "700",
    color: colors.primary,
  },
  chevron: {
    fontSize: 10,
    color: colors.textMuted,
    marginLeft: 6,
  },
  telemetryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: spacing.xs,
    marginTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.06)",
  },
  telemetryItem: {
    flex: 1,
  },
  telemetryItemRight: {
    alignItems: "flex-end",
  },
  metricLabel: {
    ...typography.label,
    fontSize: 9,
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  metricValue: {
    ...typography.body,
    fontSize: 12,
    fontWeight: "600",
    color: colors.text,
    marginTop: 1,
  },
});
