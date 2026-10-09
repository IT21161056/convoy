import { Button, Input, Screen, useToast } from "@/components/ui";
import { convoyCommands } from "@/features/convoy";
import { getItem, setItem, STORAGE_KEYS } from "@/services/storage";
import { colors, radii, spacing, typography } from "@/theme";
import * as Clipboard from "expo-clipboard";
import { router, Stack } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Share, StyleSheet, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";

type Stage = "form" | "ready";

export default function CreateConvoyScreen() {
  const toast = useToast();
  const [name, setName] = useState("");
  const [convoyName, setConvoyName] = useState("");
  const [stage, setStage] = useState<Stage>("form");
  const [code, setCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [showQR, setShowQR] = useState(false);

  useEffect(() => {
    void getItem<string>(STORAGE_KEYS.userName).then((saved) => {
      if (saved) setName(saved);
    });
  }, []);

  const canCreate = name.trim().length > 0 && convoyName.trim().length > 0;

  const handleCreate = async () => {
    if (!canCreate) return;
    setCreating(true);
    try {
      const trimmedHost = name.trim();
      await setItem(STORAGE_KEYS.userName, trimmedHost);
      const convoy = await convoyCommands.create({
        name: convoyName.trim(),
        hostName: trimmedHost,
      });
      setCode(convoy.code);
      setStage("ready");
    } catch (err) {
      toast.show({
        message: err instanceof Error ? err.message : String(err),
        variant: "error",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleShare = async () => {
    await Share.share({
      message: `Join my convoy "${convoyName}" on Convoy.\nCode: ${code}`,
    });
  };

  const handleGoToLobby = () => {
    router.replace("/(convoy)/lobby");
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
        {stage === "form" ? (
          <View style={styles.body}>
            <View style={styles.header}>
              <Text style={styles.title}>Create Convoy</Text>
              <Text style={styles.subtitle}>
                Give your trip a name. You'll be the host.
              </Text>
            </View>

            <View style={styles.form}>
              <Input
                label="Your name"
                value={name}
                onChangeText={setName}
                placeholder="Anoj"
                autoCapitalize="words"
                returnKeyType="next"
              />
              <Input
                label="Convoy name"
                value={convoyName}
                onChangeText={setConvoyName}
                placeholder="Weekend Road Trip"
                autoCapitalize="words"
                returnKeyType="done"
              />
            </View>

            <View style={styles.actions}>
              <Button
                label="Create Convoy"
                size="lg"
                loading={creating}
                disabled={!canCreate}
                onPress={handleCreate}
              />
            </View>
          </View>
        ) : (
          <View style={styles.body}>
            <View style={styles.header}>
              <Text style={styles.title}>Your convoy is ready!</Text>
              <Text style={styles.subtitle}>{convoyName}</Text>
            </View>

            <View style={styles.codeCard}>
              <Text style={styles.codeLabel}>Convoy code</Text>
              <Pressable
                onPress={async () => {
                  await Clipboard.setStringAsync(code);
                  toast.show({
                    message: "Convoy code copied",
                    variant: "success",
                  });
                }}
                hitSlop={12}
              >
                <Text style={styles.code}>{code}</Text>
              </Pressable>
              <Text style={styles.codeHint}>Share this with your group.</Text>
            </View>

            {showQR ? (
              <View style={styles.qrWrap}>
                <View style={styles.qrInner}>
                  <QRCode
                    value={`convoynew://invite/${code}`}
                    size={200}
                    color={colors.background}
                    backgroundColor={colors.text}
                  />
                </View>
              </View>
            ) : null}

            <View style={styles.actions}>
              <Button label="Share Invite" size="lg" onPress={handleShare} />
              <Button
                label={showQR ? "Hide QR Code" : "Show QR Code"}
                variant="secondary"
                size="lg"
                onPress={() => setShowQR((s) => !s)}
              />
              <Pressable onPress={handleGoToLobby} style={styles.skip}>
                <Text style={styles.skipText}>Continue to lobby →</Text>
              </Pressable>
            </View>
          </View>
        )}
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
  form: { gap: spacing.lg },
  actions: {
    marginTop: "auto",
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  codeCard: {
    backgroundColor: colors.panel,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.divider,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    gap: spacing.sm,
  },
  codeLabel: { ...typography.label },
  code: {
    ...typography.h1,
    fontSize: 42,
    letterSpacing: 8,
    color: colors.primary,
  },
  codeHint: {
    ...typography.bodyMuted,
    fontSize: 13,
  },
  skip: {
    alignSelf: "center",
    paddingVertical: spacing.md,
  },
  skipText: {
    ...typography.bodyMuted,
    color: colors.primary,
  },
  qrWrap: {
    alignItems: "center",
    marginTop: spacing.lg,
  },
  qrInner: {
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.text,
  },
});
