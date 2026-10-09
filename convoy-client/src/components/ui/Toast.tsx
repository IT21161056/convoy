import { colors, radii, spacing, typography } from "@/theme";
import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type ToastVariant = "default" | "success" | "error";

interface ToastProps {
  message: string;
  variant: ToastVariant;
  visible: boolean;
  /** Pixels above the safe area bottom. Pass 0 for standard placement. */
  bottomOffset?: number;
}

export function Toast({
  message,
  variant,
  visible,
  bottomOffset = 0,
}: ToastProps) {
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: visible ? 1 : 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: visible ? 0 : 20,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, opacity, translateY]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.container,
        {
          opacity,
          transform: [{ translateY }],
          bottom: insets.bottom + spacing.xl + bottomOffset,
        },
      ]}
    >
      <Animated.View style={[styles.pill, variantStyles[variant].pill]}>
        <Text style={[styles.text, variantStyles[variant].text]}>
          {message}
        </Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    paddingHorizontal: spacing.lg,
  },
  pill: {
    maxWidth: "100%",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  text: {
    ...typography.body,
    fontSize: 14,
  },
});

const variantStyles = {
  default: StyleSheet.create({
    pill: {
      backgroundColor: colors.raised,
      borderColor: colors.divider,
    },
    text: { color: colors.text },
  }),
  success: StyleSheet.create({
    pill: {
      backgroundColor: colors.raised,
      borderColor: colors.connected,
    },
    text: { color: colors.connected },
  }),
  error: StyleSheet.create({
    pill: {
      backgroundColor: colors.raised,
      borderColor: colors.alert,
    },
    text: { color: colors.alert },
  }),
} as const;
