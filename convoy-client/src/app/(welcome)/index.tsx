import { Button, Screen } from "@/components/ui";
import { colors, spacing, typography } from "@/theme";
import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

const FEATURES = [
  "Live location",
  "Push to talk",
  "Group chat",
  "Safety alerts",
];

export default function WelcomeScreen() {
  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.brand}>CONVOY</Text>
        <Text style={styles.tagline}>Stay together on the road.</Text>
      </View>

      <View style={styles.features}>
        {FEATURES.map((feature) => (
          <View key={feature} style={styles.featureRow}>
            <View style={styles.bullet} />
            <Text style={styles.featureText}>{feature}</Text>
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        <Button
          label="Start a Convoy"
          variant="primary"
          size="lg"
          onPress={() => router.push("/(welcome)/create")}
        />
        <Button
          label="Join a Convoy"
          variant="secondary"
          size="lg"
          onPress={() => router.push("/(welcome)/join")}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    marginTop: spacing.xxl,
    marginBottom: spacing.xxl,
  },
  brand: {
    ...typography.h1,
    fontSize: 44,
    letterSpacing: 6,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  tagline: {
    ...typography.bodyMuted,
    fontSize: 16,
  },
  features: {
    flex: 1,
    justifyContent: "center",
    gap: spacing.lg,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  featureText: {
    ...typography.body,
    fontSize: 17,
  },
  actions: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
});
