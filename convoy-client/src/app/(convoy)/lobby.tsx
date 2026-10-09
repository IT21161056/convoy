import { SettingRow } from "@/components/settings";
import { BackButton, Button, Screen, useToast } from "@/components/ui";
import { convoyCommands, getSelf, useConvoy } from "@/features/convoy";
import { colors, radii, spacing, typography } from "@/theme";
import type { Member } from "@/types";
import { router } from "expo-router";
import { useEffect } from "react";
import { Alert, Pressable, Share, StyleSheet, Text, View } from "react-native";

export default function LobbyScreen() {
  const convoy = useConvoy();
  const toast = useToast();

  // If the convoy is already active, this screen is not the right place.
  // Must run before any early return to keep hook order stable.
  const phase = convoy?.phase;
  useEffect(() => {
    if (phase === "active") {
      router.replace("/(convoy)/map");
    }
  }, [phase]);

  if (!convoy) return null;

  const self = getSelf(convoy);
  const isHost = self?.isHost ?? false;

  const handleStart = () => {
    convoyCommands.start();
    // Navigate immediately — the server will echo `phase: 'active'` shortly
    // and the map will already be waiting there.
    router.replace("/(convoy)/map");
  };

  const handleShare = async () => {
    await Share.share({
      message: `Join my convoy "${convoy.name}" on Convoy.\nCode: ${convoy.code}\nconvoynew://invite/${convoy.code}`,
    });
  };

  const handleShowQR = () => {
    router.push("/(convoy)/qr");
  };

  const handleLeave = () => {
    Alert.alert(
      "Leave convoy",
      isHost
        ? "Leaving will end the lobby for everyone currently joined."
        : "You will leave this convoy and stop sharing your location.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: () => {
            convoyCommands.leave();
            toast.show({ message: "Left convoy" });
          },
        },
      ],
    );
  };

  return (
    <Screen>
      <View style={styles.body}>
        <View style={styles.topBar}>
          <BackButton
            onPress={handleLeave}
            accessibilityLabel="Leave convoy"
          />
        </View>


        <View style={styles.header}>
          <Text style={styles.title}>{convoy.name}</Text>
          <Text style={styles.subtitle}>
            {convoy.members.length}{" "}
            {convoy.members.length === 1 ? "member" : "members"}
          </Text>
        </View>

        <View style={styles.list}>
          {convoy.members.map((member) => (
            <MemberRow
              key={member.id}
              member={member}
              isSelf={member.id === convoy.selfId}
            />
          ))}
        </View>

        {isHost ? (
          <View style={styles.inviteBlock}>
            <SettingRow
              label="Invite members"
              value="Share link"
              onPress={handleShare}
            />
            <SettingRow label="Show QR code" onPress={handleShowQR} />
          </View>
        ) : null}

        <View style={styles.actions}>
          {isHost ? (
            <>
              <Text style={styles.readyText}>Ready to go?</Text>
              <Button label="Start Convoy" size="lg" onPress={handleStart} />
            </>
          ) : (
            <Text style={styles.waiting}>Waiting for host…</Text>
          )}

          <Pressable onPress={handleLeave} style={styles.leaveLink}>
            <Text style={styles.leaveText}>Leave convoy</Text>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}

function MemberRow({ member, isSelf }: { member: Member; isSelf: boolean }) {
  return (
    <View style={styles.row}>
      <View
        style={[
          styles.dot,
          member.status === "connected" || member.status === "live"
            ? styles.dotConnected
            : member.status === "offline" || member.status === "lost"
              ? styles.dotOffline
              : styles.dotStale,
        ]}
      />
      <Text style={styles.rowName} numberOfLines={1}>
        {member.name}
        {isSelf ? " (you)" : ""}
      </Text>
      {member.isHost ? <Text style={styles.hostTag}>Host</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    paddingTop: spacing.lg,
  },
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.h1,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.bodyMuted,
    fontSize: 15,
  },
  list: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.divider,
    gap: spacing.md,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotConnected: { backgroundColor: colors.connected },
  dotStale: { backgroundColor: colors.primary },
  dotOffline: { backgroundColor: colors.textMuted },
  rowName: {
    ...typography.body,
    flex: 1,
  },
  hostTag: {
    ...typography.label,
    color: colors.primary,
    textTransform: "none",
  },
  actions: {
    marginTop: "auto",
    marginBottom: spacing.xl,
    gap: spacing.md,
    alignItems: "stretch",
  },
  readyText: {
    ...typography.bodyMuted,
    textAlign: "center",
  },
  waiting: {
    ...typography.bodyMuted,
    textAlign: "center",
    paddingVertical: spacing.lg,
  },
  inviteBlock: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    borderRadius: radii.md,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  topBar: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.raised,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  backText: {
    ...typography.body,
    fontSize: 18,
    color: colors.text,
  },
  leaveLink: {
    alignSelf: "center",
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  leaveText: {
    ...typography.bodyMuted,
    color: colors.alert,
    fontSize: 14,
  },
});
