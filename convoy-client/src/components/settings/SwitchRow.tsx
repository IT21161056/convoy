import { colors, spacing, typography } from "@/theme";
import { StyleSheet, Switch, Text, View } from "react-native";

interface SwitchRowProps {
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
}

export function SwitchRow({
  label,
  value,
  onValueChange,
  disabled = false,
}: SwitchRowProps) {
  return (
    <View style={styles.row}>
      <Text style={[styles.label, disabled && styles.labelDisabled]}>
        {label}
      </Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: colors.divider, true: colors.primary }}
        thumbColor={colors.text}
        ios_backgroundColor={colors.divider}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    minHeight: 52,
    gap: spacing.md,
  },
  label: {
    ...typography.body,
    fontSize: 16,
    flex: 1,
  },
  labelDisabled: {
    color: colors.textMuted,
  },
});
