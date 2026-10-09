import { colors, spacing, typography } from "@/theme";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface SettingRowProps {
  label: string;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
  rightAccessory?: React.ReactNode;
}

export function SettingRow({
  label,
  value,
  onPress,
  destructive = false,
  rightAccessory,
}: SettingRowProps) {
  const content = (
    <View style={styles.row}>
      <Text
        style={[styles.label, destructive && styles.labelDestructive]}
        numberOfLines={1}
      >
        {label}
      </Text>
      <View style={styles.right}>
        {value ? <Text style={styles.value}>{value}</Text> : null}
        {rightAccessory}
      </View>
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    gap: spacing.md,
    minHeight: 52,
  },
  pressed: { opacity: 0.7 },
  label: {
    ...typography.body,
    fontSize: 16,
    flex: 1,
  },
  labelDestructive: {
    color: colors.alert,
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  value: {
    ...typography.bodyMuted,
    fontSize: 14,
  },
});
