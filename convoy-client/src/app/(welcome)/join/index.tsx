import { BackButton, Screen } from "@/components/ui";
import { colors, radii, spacing, typography } from "@/theme";
import { router, Stack } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

export default function JoinChooserScreen() {
  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          title: "",
          headerLeft: () => (
            <BackButton
              buttonSize={36}
              size={18}
              onPress={() => router.back()}
              style={{ marginRight: spacing.sm }}
            />
          ),
        }}
      />

      <Screen>
        <View style={styles.body}>
          <View style={styles.header}>
            <Text style={styles.title}>Join a Convoy</Text>
            <Text style={styles.subtitle}>
              Choose how you'd like to join your group.
            </Text>
          </View>

          <View style={styles.cards}>
            {/* Card 1: Scan QR Code */}
            <Pressable
              style={({ pressed }) => [
                styles.card,
                styles.qrCard,
                pressed && styles.cardPressed,
              ]}
              onPress={() => router.push("/(welcome)/join/scan")}
            >
              <View style={styles.iconCircle}>
                <Text style={styles.iconText}>📷</Text>
              </View>
              <View style={styles.cardContent}>
                <View style={styles.cardTitleRow}>
                  <Text style={styles.cardTitle}>Scan QR Code</Text>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>FASTEST</Text>
                  </View>
                </View>
                <Text style={styles.cardDesc}>
                  Point your camera at the host's device to join instantly.
                </Text>
              </View>
              <Text style={styles.chevron}>→</Text>
            </Pressable>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Card 2: Enter Code */}
            <Pressable
              style={({ pressed }) => [
                styles.card,
                pressed && styles.cardPressed,
              ]}
              onPress={() => router.push("/(welcome)/join/code")}
            >
              <View style={[styles.iconCircle, styles.iconCircleSecondary]}>
                <Text style={styles.iconText}>⌨️</Text>
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>Enter Convoy Code</Text>
                <Text style={styles.cardDesc}>
                  Type the 5-character trip code (e.g. 8K4P7).
                </Text>
              </View>
              <Text style={styles.chevron}>→</Text>
            </Pressable>
          </View>
        </View>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
  },
  header: {
    marginTop: spacing.lg,
    marginBottom: spacing.xxl,
  },
  title: {
    ...typography.h1,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.bodyMuted,
    fontSize: 15,
  },
  cards: {
    gap: spacing.lg,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  qrCard: {
    borderColor: "rgba(245, 166, 35, 0.4)",
    backgroundColor: "rgba(26, 32, 41, 0.95)",
  },
  cardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: radii.md,
    backgroundColor: "rgba(245, 166, 35, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(245, 166, 35, 0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconCircleSecondary: {
    backgroundColor: colors.raised,
    borderColor: colors.divider,
  },
  iconText: {
    fontSize: 22,
  },
  cardContent: {
    flex: 1,
    gap: 4,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  cardTitle: {
    ...typography.h3,
    fontSize: 18,
    color: colors.text,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.sm,
    backgroundColor: "rgba(245, 166, 35, 0.2)",
  },
  badgeText: {
    ...typography.label,
    fontSize: 10,
    color: colors.primary,
    letterSpacing: 0.5,
  },
  cardDesc: {
    ...typography.bodyMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  chevron: {
    fontSize: 20,
    color: colors.textMuted,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.xs,
    gap: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.divider,
  },
  dividerText: {
    ...typography.label,
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: 1,
  },
});
