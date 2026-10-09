import type {
  LocationPermission,
  LocationServiceState,
} from "@/features/location";
import { colors, radii, spacing, typography } from "@/theme";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";

interface LocationStatusBannerProps {
  permission: LocationPermission;
  serviceState: LocationServiceState;
  onRequest?: () => void;
}

export function LocationStatusBanner({
  permission,
  serviceState,
  onRequest,
}: LocationStatusBannerProps) {
  const view = present(permission, serviceState);
  if (!view) return null;

  const handlePress = () => {
    if (view.openSettings) {
      Linking.openSettings();
      return;
    }
    onRequest?.();
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [styles.wrap, pressed && styles.pressed]}
    >
      <Text style={styles.icon}>{view.icon}</Text>
      <View style={styles.textBlock}>
        <Text style={styles.title}>{view.title}</Text>
        <Text style={styles.hint}>{view.hint}</Text>
      </View>
    </Pressable>
  );
}

function present(
  permission: LocationPermission,
  serviceState: LocationServiceState,
) {
  if (permission === "granted" && serviceState === "on") {
    return null; // healthy — no banner
  }

  if (permission === "denied") {
    return {
      icon: "⚠",
      title: "Location access denied",
      hint: "Tap to open settings",
      openSettings: true,
    };
  }

  if (permission === "granted" && serviceState === "servicesOff") {
    return {
      icon: "⚠",
      title: "Location unavailable",
      hint: "Turn on Location Services",
      openSettings: true,
    };
  }

  if (permission === "unknown") {
    return {
      icon: "📍",
      title: "Allow location access",
      hint: "Tap to enable",
      openSettings: false,
    };
  }

  // permission granted, service state anything else — safest fallback
  return {
    icon: "⚠",
    title: "Location unavailable",
    hint: "Tap to retry",
    openSettings: false,
  };
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    backgroundColor: colors.raised,
    borderWidth: 1,
    borderColor: colors.alert,
  },
  pressed: { opacity: 0.85 },
  icon: {
    fontSize: 18,
    color: colors.alert,
  },
  textBlock: { flex: 1, gap: 2 },
  title: {
    ...typography.body,
    fontSize: 14,
    color: colors.alert,
  },
  hint: {
    ...typography.bodyMuted,
    fontSize: 12,
  },
});
