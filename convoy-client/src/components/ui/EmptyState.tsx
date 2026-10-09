import { spacing, typography } from "@/theme";
import { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

interface EmptyStateProps {
  icon?: string;
  title: string;
  hint?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, hint, action }: EmptyStateProps) {
  return (
    <View style={styles.wrap}>
      {icon ? <Text style={styles.icon}>{icon}</Text> : null}
      <Text style={styles.title}>{title}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
    gap: spacing.sm,
  },
  icon: {
    fontSize: 32,
    marginBottom: spacing.sm,
    opacity: 0.7,
  },
  title: {
    ...typography.h3,
    textAlign: "center",
  },
  hint: {
    ...typography.bodyMuted,
    fontSize: 14,
    textAlign: "center",
  },
  action: {
    marginTop: spacing.lg,
    alignSelf: "stretch",
  },
});
