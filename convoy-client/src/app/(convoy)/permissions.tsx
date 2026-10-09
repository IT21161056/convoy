import { Section, SwitchRow } from "@/components/settings";
import { BackButton, Screen, useToast } from "@/components/ui";
import { convoyCommands, getSelf, useConvoy } from "@/features/convoy";
import { colors, spacing, typography } from "@/theme";
import { router, Stack } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";

export default function PermissionsScreen() {
  const convoy = useConvoy();
  const toast = useToast();

  if (!convoy) return null;

  const self = getSelf(convoy);
  const isHost = self?.isHost ?? false;
  const { settings } = convoy;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          title: "Member Permissions",
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

      <Screen padded={false}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {!isHost ? (
            <View style={styles.notice}>
              <Text style={styles.noticeText}>
                Only the host can change member permissions.
              </Text>
            </View>
          ) : null}

          <Section title="Communication">
            <SwitchRow
              label="Members can use push-to-talk"
              value={settings.membersCanPtt}
              onValueChange={(v) => {
                convoyCommands.updateSettings({ membersCanPtt: v });
                toast.show({
                  message: v
                    ? "Members can use push-to-talk"
                    : "Push-to-talk restricted to host",
                });
              }}
              disabled={!isHost}
            />
            <SwitchRow
              label="Members can send chat messages"
              value={settings.membersCanChat}
              onValueChange={(v) => {
                convoyCommands.updateSettings({ membersCanChat: v });
                toast.show({
                  message: v
                    ? "Members can send chat"
                    : "Chat restricted to host",
                });
              }}
              disabled={!isHost}
            />
          </Section>

          <Section title="Invitations">
            <SwitchRow
              label="Members can invite others"
              value={settings.membersCanInvite}
              onValueChange={(v) => {
                convoyCommands.updateSettings({ membersCanInvite: v });
                toast.show({
                  message: v
                    ? "Members can invite others"
                    : "Invites restricted to host",
                });
              }}
              disabled={!isHost}
            />
          </Section>


          <Text style={styles.footer}>
            Permission changes take effect immediately for all members.
          </Text>
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
  notice: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 10,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  noticeText: {
    ...typography.bodyMuted,
    fontSize: 14,
    textAlign: "center",
  },
  footer: {
    ...typography.bodyMuted,
    fontSize: 12,
    textAlign: "center",
    marginTop: spacing.md,
  },
});
