import { Button, Sheet } from "@/components/ui";
import { colors, spacing, typography } from "@/theme";
import type { Member } from "@/types";
import { timeAgo } from "@/utils/format";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

interface MemberDetailSheetProps {
  visible: boolean;
  member: Member | null;
  /** The local user's member id — used to label self as "You". */
  selfId: string;
  onClose: () => void;
  /** Optional relative position string, e.g. "350 m ahead". */
  relativePosition?: string;
  onFocus?: (member: Member) => void;
}

export function MemberDetailSheet({
  visible,
  member,
  selfId,
  onClose,
  relativePosition,
  onFocus,
}: MemberDetailSheetProps) {
  const [now, setNow] = useState(Date.now());

  // Keep the "x seconds ago" text fresh while the sheet is open.
  useEffect(() => {
    if (!visible) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [visible]);

  if (!member) return null;

  const isSelf = member.id === selfId;
  const displayName = isSelf ? "You" : member.name;
  const { label: statusLabel, color: statusColor } = statusPresentation(member);
  const lastSeen = member.lastSeenAt ? timeAgo(member.lastSeenAt, now) : null;

  return (
    <Sheet visible={visible} onClose={onClose}>
      <View style={styles.body}>
        <Text style={styles.name}>{displayName}</Text>

        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusLabel, { color: statusColor }]}>
            {statusLabel}
          </Text>
        </View>

        {!isSelf && relativePosition ? (
          <View style={styles.relativeRow}>
            <Text style={styles.relativeIcon}>🚗</Text>
            <Text style={styles.relativeText}>{relativePosition}</Text>
          </View>
        ) : null}

        <View style={styles.divider} />

        <Text style={styles.metaLabel}>Last update</Text>
        <Text style={styles.metaValue}>{lastSeen ?? "No data yet"}</Text>

        {!isSelf && onFocus ? (
          <View style={styles.action}>
            <Button
              label="Focus on Map"
              size="lg"
              onPress={() => {
                onFocus(member);
                onClose();
              }}
            />
          </View>
        ) : null}
      </View>
    </Sheet>
  );
}

/* ---------- helpers ---------- */

function statusPresentation(member: Member) {
  switch (member.status) {
    case "connected":
    case "live":
      return { label: "Connected", color: colors.connected };
    case "delayed":
      return { label: "Delayed signal", color: colors.primary };
    case "stale":
      return { label: "Location unavailable", color: colors.primary };
    case "lost":
      return { label: "Signal lost", color: colors.alert };
    case "offline":
    default:
      return { label: "Offline", color: colors.alert };
  }
}

const styles = StyleSheet.create({
  body: {
    padding: spacing.xl,
    gap: spacing.sm,
    alignItems: "center",
  },
  name: {
    ...typography.h2,
    textAlign: "center",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusLabel: {
    ...typography.body,
    fontSize: 14,
  },
  relativeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  relativeIcon: {
    fontSize: 18,
  },
  relativeText: {
    ...typography.body,
    fontSize: 16,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    alignSelf: "stretch",
    marginVertical: spacing.lg,
  },
  metaLabel: {
    ...typography.label,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    alignSelf: "center",
  },
  metaValue: {
    ...typography.body,
    fontSize: 15,
    alignSelf: "center",
  },
  action: {
    alignSelf: "stretch",
    marginTop: spacing.xl,
  },
});
