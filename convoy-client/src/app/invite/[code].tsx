import { Button, Screen, useToast } from "@/components/ui";
import { convoyCommands } from "@/features/convoy";
import { getItem, STORAGE_KEYS } from "@/services/storage";
import { colors, radii, spacing, typography } from "@/theme";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

export default function InviteScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const toast = useToast();
  const [joining, setJoining] = useState(false);

  const normalizedCode = (code ?? "").toUpperCase();

  // If a convoy is already active, don't let the user join a second one
  // by accident.
  const handleJoin = async () => {
    if (!normalizedCode) return;
    setJoining(true);

    try {
      const savedName = await getItem<string>(STORAGE_KEYS.userName);
      if (savedName) {
        await convoyCommands.join({ name: savedName, code: normalizedCode });
        toast.show({
          message: `Joined convoy ${normalizedCode}`,
          variant: "success",
        });
        router.replace("/(convoy)/lobby");
      } else {
        router.replace({
          pathname: "/(welcome)/join/code",
          params: { code: normalizedCode },
        });
      }
    } catch (err) {
      toast.show({
        message: err instanceof Error ? err.message : "Failed to join convoy",
        variant: "error",
      });
    } finally {
      setJoining(false);
    }
  };

  if (!normalizedCode) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <Screen>
          <View style={styles.body}>
            <Text style={styles.title}>Invalid invite</Text>
            <Text style={styles.subtitle}>
              This invite link is missing a convoy code.
            </Text>
            <Button
              label="Enter a Code Instead"
              onPress={() => router.replace("/(welcome)/join/code")}
            />
          </View>
        </Screen>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Screen>
        <View style={styles.body}>
          <Text style={styles.eyebrow}>You've been invited</Text>
          <Text style={styles.title}>Join this convoy?</Text>
          <Text style={styles.subtitle}>
            Someone shared an invite to a convoy. Tap join to enter the lobby.
          </Text>

          <View style={styles.codeCard}>
            <Text style={styles.codeLabel}>Convoy code</Text>
            <Text style={styles.code}>{normalizedCode}</Text>
          </View>

          <View style={styles.actions}>
            <Button
              label="Join"
              size="lg"
              loading={joining}
              onPress={handleJoin}
            />
            <Button
              label="Not now"
              variant="ghost"
              size="lg"
              onPress={() => router.replace("/(welcome)")}
            />
          </View>
        </View>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    justifyContent: "center",
    gap: spacing.md,
  },
  eyebrow: {
    ...typography.label,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    color: colors.primary,
  },
  title: {
    ...typography.h1,
  },
  subtitle: {
    ...typography.bodyMuted,
    fontSize: 15,
    marginBottom: spacing.md,
  },
  codeCard: {
    alignItems: "center",
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.divider,
    gap: spacing.sm,
  },
  codeLabel: {
    ...typography.label,
  },
  code: {
    ...typography.h1,
    fontSize: 42,
    letterSpacing: 8,
    color: colors.primary,
  },
  actions: {
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
});
