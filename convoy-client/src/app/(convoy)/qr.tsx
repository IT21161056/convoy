import { Button, useToast } from "@/components/ui";
import { useConvoy } from "@/features/convoy";
import { colors, radii, spacing, typography } from "@/theme";
import * as Clipboard from "expo-clipboard";
import { Stack, router } from "expo-router";
import { Pressable, Share, StyleSheet, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { SafeAreaView } from "react-native-safe-area-context";

export default function QRScreen() {
  const convoy = useConvoy();
  const toast = useToast();
  if (!convoy) return null;

  const payload = `convoynew://invite/${convoy.code}`;

  const handleShare = async () => {
    await Share.share({
      message: `Join my convoy "${convoy.name}" on Convoy.\nCode: ${convoy.code}\n${payload}`,
    });
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.topBar}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={styles.iconButton}
          >
            <Text style={styles.iconText}>←</Text>
          </Pressable>
        </View>

        <View style={styles.body}>
          <Text style={styles.title}>{convoy.name}</Text>
          <Text style={styles.subtitle}>Scan this to join the convoy</Text>

          <View style={styles.qrFrame}>
            <View style={styles.qrInner}>
              <QRCode
                value={payload}
                size={240}
                color={colors.background}
                backgroundColor={colors.text}
              />
            </View>
          </View>

          <Text style={styles.codeLabel}>Convoy code</Text>
          <Pressable
            onPress={async () => {
              await Clipboard.setStringAsync(convoy.code);
              toast.show({
                message: "Convoy code copied",
                variant: "success",
              });
            }}
            hitSlop={12}
          >
            <Text style={styles.code}>{convoy.code}</Text>
          </Pressable>
        </View>

        <View style={styles.actions}>
          <Button label="Share Invite" size="lg" onPress={handleShare} />
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.raised,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  iconText: {
    ...typography.body,
    fontSize: 18,
    color: colors.text,
  },
  body: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  title: {
    ...typography.h1,
    textAlign: "center",
  },
  subtitle: {
    ...typography.bodyMuted,
    fontSize: 15,
    marginBottom: spacing.lg,
  },
  qrFrame: {
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  qrInner: {
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.text,
  },
  codeLabel: {
    ...typography.label,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginTop: spacing.lg,
  },
  code: {
    ...typography.h1,
    fontSize: 40,
    letterSpacing: 8,
    color: colors.primary,
  },
  actions: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
});
