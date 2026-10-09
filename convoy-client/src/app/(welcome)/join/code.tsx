import { Button, CodeInput, Input, Screen } from "@/components/ui";
import { convoyCommands } from "@/features/convoy";
import { getItem, setItem, STORAGE_KEYS } from "@/services/storage";
import { colors, spacing, typography } from "@/theme";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

const CODE_LENGTH = 5;

export default function EnterCodeScreen() {
  const { code: codeParam } = useLocalSearchParams<{ code?: string }>();
  const [name, setName] = useState("");
  const [code, setCode] = useState(
    (codeParam ?? "")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, CODE_LENGTH),
  );
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void getItem<string>(STORAGE_KEYS.userName).then((saved) => {
      if (saved) setName(saved);
    });
  }, []);

  useEffect(() => {
    if (codeParam) {
      setCode(
        codeParam
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, "")
          .slice(0, CODE_LENGTH),
      );
    }
  }, [codeParam]);

  const canJoin = code.length === CODE_LENGTH && name.trim().length > 0;

  const handleJoin = async () => {
    if (!canJoin) return;
    const trimmedName = name.trim();
    setError(null);
    setJoining(true);
    try {
      await setItem(STORAGE_KEYS.userName, trimmedName);
      await convoyCommands.join({ code, name: trimmedName });
      router.replace("/(convoy)/lobby");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not join convoy.");
    } finally {
      setJoining(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          title: "",
        }}
      />
      <Screen>
        <View style={styles.body}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {codeParam ? "Join Convoy" : "Enter Convoy Code"}
            </Text>
            <Text style={styles.subtitle}>
              {codeParam
                ? `Code ${code} detected. Enter your name to join the trip.`
                : `Ask the host for the ${CODE_LENGTH}-character code.`}
            </Text>
          </View>

          <View style={styles.inputBlock}>
            <Input
              label="Your name"
              value={name}
              onChangeText={setName}
              placeholder="e.g. Kasun"
              autoCapitalize="words"
              autoFocus={Boolean(codeParam)}
              returnKeyType={code ? "go" : "next"}
              onSubmitEditing={canJoin ? handleJoin : undefined}
            />
            <Text style={styles.codeLabel}>Convoy Code</Text>
            <CodeInput
              length={CODE_LENGTH}
              value={code}
              onChangeText={(text) => {
                setError(null);
                setCode(text);
              }}
              autoFocus={!name && !codeParam}
              returnKeyType="go"
              onSubmitEditing={handleJoin}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </View>

          <View style={styles.actions}>
            <Button
              label="Join"
              size="lg"
              loading={joining}
              disabled={!canJoin}
              onPress={handleJoin}
            />
          </View>
        </View>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1 },
  header: {
    marginTop: spacing.xl,
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
  inputBlock: { gap: spacing.md },
  codeLabel: {
    ...typography.label,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  error: {
    ...typography.bodyMuted,
    color: colors.alert,
    textAlign: "center",
  },
  actions: {
    marginTop: "auto",
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
});
