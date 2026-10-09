import React from "react";
import {
  Insets,
  Pressable,
  StyleProp,
  StyleSheet,
  ViewStyle,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { colors, radii } from "@/theme";

export interface BackButtonProps {
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  size?: number;
  buttonSize?: number;
  color?: string;
  variant?: "chevron" | "close";
  accessibilityLabel?: string;
  hitSlop?: Insets | number;
}

export function BackButton({
  onPress,
  style,
  size = 20,
  buttonSize = 40,
  color = colors.text,
  variant = "chevron",
  accessibilityLabel = "Back",
  hitSlop = 12,
}: BackButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={hitSlop}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.button,
        {
          width: buttonSize,
          height: buttonSize,
          borderRadius: buttonSize / 2,
        },
        pressed && styles.pressed,
        style,
      ]}
    >
      <Svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {variant === "chevron" ? (
          <Path d="M15 19l-7-7 7-7" />
        ) : (
          <Path d="M18 6L6 18M6 6l12 12" />
        )}
      </Svg>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.raised,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  pressed: {
    backgroundColor: "rgba(255, 255, 255, 0.16)",
    borderColor: "rgba(255, 255, 255, 0.22)",
    transform: [{ scale: 0.95 }],
  },
});

export default BackButton;
