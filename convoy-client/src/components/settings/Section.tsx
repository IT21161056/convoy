import { colors, radii, spacing, typography } from "@/theme";
import { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

interface SectionProps {
  title?: string;
  children: ReactNode;
}

export function Section({ title, children }: SectionProps) {
  return (
    <View style={styles.wrap}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      <View style={styles.panel}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  title: {
    ...typography.label,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    paddingHorizontal: spacing.xs,
  },
  panel: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    borderRadius: radii.md,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.divider,
  },
});
