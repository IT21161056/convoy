import { Section, SettingRow, SwitchRow } from "@/components/settings";
import { Input, Screen, useToast } from "@/components/ui";
import { chatStore } from "@/features/chat";
import {
  convoyCommands,
  convoyStore,
  getSelf,
  useConvoy,
} from "@/features/convoy";
import { locationStore, useBackgroundPermission } from "@/features/location";
import { colors, spacing, typography } from "@/theme";
import { router, Stack } from "expo-router";
import { useState } from "react";
import { Alert, ScrollView, Share, StyleSheet, Text, View } from "react-native";

export default function SettingsScreen() {
  const convoy = useConvoy();
  const toast = useToast();
  const bgPermission = useBackgroundPermission();

  const [nameDraft, setNameDraft] = useState(convoy?.name ?? "");

  if (!convoy) return null;

  const self = getSelf(convoy);
  const isHost = self?.isHost ?? false;

  const handleShareInvite = async () => {
    await Share.share({
      message: `Join my convoy "${convoy.name}" on Convoy.\nCode: ${convoy.code}\nconvoynew://invite/${convoy.code}`,
    });
  };

  const handleShowQR = () => {
    router.push("/(convoy)/qr");
  };

  const handleRename = () => {
    const trimmed = nameDraft.trim();
    if (!trimmed || trimmed === convoy.name) {
      setNameDraft(convoy.name);
      return;
    }
    convoyCommands.rename(trimmed);
    toast.show({ message: "Convoy renamed", variant: "success" });
  };

  const handleLeave = () => {
    Alert.alert(
      "Leave convoy",
      "You will stop sharing your location and leave the convoy.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: () => {
            locationStore.stop();
            chatStore.clear();
            convoyCommands.leave();
            router.replace("/(welcome)");
          },
        },
      ],
    );
  };

  const handleEnd = () => {
    Alert.alert(
      "End convoy",
      "This ends the trip for everyone. Members will no longer share locations.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "End Convoy",
          style: "destructive",
          onPress: () => {
            // Just emit. The server verifies host, broadcasts
            // `convoy:ended`, and every client — including this one —
            // tears down via useMemberSync's handler.
            convoyCommands.end();
          },
        },
      ],
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          title: "Convoy Settings",
        }}
      />
      <Screen padded={false}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* ---------- Convoy ---------- */}
          <Section title="Convoy">
            <View style={styles.nameBlock}>
              <Input
                label="Convoy name"
                value={nameDraft}
                onChangeText={setNameDraft}
                onBlur={handleRename}
                editable={isHost}
                returnKeyType="done"
                onSubmitEditing={handleRename}
              />
            </View>

            <SettingRow label="Invite members" onPress={handleShareInvite} />
            <SettingRow label="Convoy code" value={convoy.code} />
            <SettingRow label="QR code" onPress={handleShowQR} />
          </Section>

          {/* ---------- Privacy ---------- */}
          <Section title="Privacy">
            <SwitchRow
              label="Share my location"
              value={convoy.settings.locationSharing}
              onValueChange={(v) => {
                convoyCommands.updateSettings({ locationSharing: v });
                if (v) {
                  void locationStore.start();
                } else {
                  locationStore.stop();
                  convoyCommands.clearLocation();
                }
                toast.show({
                  message: v ? "Location sharing on" : "Location sharing off",
                  variant: v ? "success" : "default",
                });
              }}
            />
            <SettingRow
              label="Background tracking"
              value={bgPermission === "granted" ? "All the time" : "While in app"}
              onPress={
                bgPermission === "granted"
                  ? undefined
                  : async () => {
                      const granted =
                        await locationStore.requestBackgroundPermission();
                      toast.show({
                        message: granted
                          ? "Background location enabled"
                          : "Location limited to while using app",
                        variant: granted ? "success" : "default",
                      });
                    }
              }
            />
            <SettingRow
              label="Member permissions"
              value={isHost ? "Manage" : "View"}
              onPress={() => router.push("/(convoy)/permissions")}
            />
          </Section>


          {/* ---------- Danger ---------- */}
          <Section>
            <SettingRow
              label="Leave convoy"
              onPress={handleLeave}
              destructive
            />
            {isHost ? (
              <SettingRow label="End convoy" onPress={handleEnd} destructive />
            ) : null}
          </Section>

          {/* ---------- Footer ---------- */}
          <Text style={styles.footer}>Convoy v0.1 · Code {convoy.code}</Text>
        </ScrollView>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.xl,
  },
  nameBlock: {
    paddingVertical: spacing.md,
  },
  footer: {
    ...typography.bodyMuted,
    fontSize: 12,
    textAlign: "center",
    marginTop: spacing.lg,
  },
});
