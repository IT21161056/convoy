import { colors, radii, spacing, typography } from "@/theme";
import type { Member } from "@/types";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

interface MemberStripProps {
  members: Member[];
  selfId: string;
  onMemberPress?: (member: Member) => void;
}

export function MemberStrip({
  members,
  selfId,
  onMemberPress,
}: MemberStripProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
    >
      {members.map((member) => (
        <MemberChip
          key={member.id}
          member={member}
          isSelf={member.id === selfId}
          onPress={() => onMemberPress?.(member)}
        />
      ))}
    </ScrollView>
  );
}

function MemberChip({
  member,
  isSelf,
  onPress,
}: {
  member: Member;
  isSelf: boolean;
  onPress: () => void;
}) {
  const statusColor =
    member.status === "connected" || member.status === "live"
      ? colors.connected
      : member.status === "delayed" || member.status === "stale"
        ? colors.primary
        : member.status === "lost"
          ? colors.alert
          : colors.textMuted;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
    >
      <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
      <Text style={styles.name} numberOfLines={1}>
        {isSelf ? "You" : member.name}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: colors.raised,
    borderWidth: 1,
    borderColor: colors.divider,
    minWidth: 84,
  },
  chipPressed: { opacity: 0.75 },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  name: {
    ...typography.body,
    fontSize: 14,
  },
});
