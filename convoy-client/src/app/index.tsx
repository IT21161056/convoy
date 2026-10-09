import { convoyStore } from "@/features/convoy";
import { colors, spacing, typography } from "@/theme";
import { router } from "expo-router";
import { useEffect, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";

const MIN_SPLASH_MS = 900;

export default function Index() {
  const startedAtRef = useRef(Date.now());

  useEffect(() => {
    let cancelled = false;

    const boot = async () => {
      const [restored] = await Promise.all([
        convoyStore.hydrate(),
        wait(MIN_SPLASH_MS - (Date.now() - startedAtRef.current)),
      ]);

      if (cancelled) return;

      if (restored) {
        const restoredConvoy = convoyStore.getState();
        if (restoredConvoy?.phase === "active") {
          router.replace("/(convoy)/map");
        } else {
          router.replace("/(convoy)/lobby");
        }
      } else {
        router.replace("/(welcome)");
      }
    };

    void boot();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.brand}>CONVOY</Text>
      <Text style={styles.tagline}>Stay together.</Text>
      <Text style={styles.tagline}>Drive together.</Text>
    </View>
  );
}

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, Math.max(0, ms)));
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  brand: {
    ...typography.h1,
    fontSize: 40,
    letterSpacing: 4,
    color: colors.primary,
    marginBottom: spacing.md,
  },
  tagline: {
    ...typography.bodyMuted,
    fontSize: 15,
  },
});
