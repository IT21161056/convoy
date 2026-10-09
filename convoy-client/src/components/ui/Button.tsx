import { colors, radii, spacing, typography } from "@/theme";
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  ViewStyle,
} from "react-native";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "md" | "lg";

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  label,
  onPress,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  fullWidth = true,
  style,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        sizeStyles[size],
        variantStyles[variant],
        fullWidth && styles.fullWidth,
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === "primary" ? colors.background : colors.text}
        />
      ) : (
        <Text style={[typography.button, textStyles[variant]]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.md,
  },
  fullWidth: { alignSelf: "stretch" },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.4 },
});

const sizeStyles = StyleSheet.create({
  md: { height: 44, paddingHorizontal: spacing.lg },
  lg: { height: 56, paddingHorizontal: spacing.xl },
});

const variantStyles = StyleSheet.create({
  primary: { backgroundColor: colors.primary },
  secondary: {
    backgroundColor: colors.raised,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  ghost: { backgroundColor: colors.transparent },
  danger: { backgroundColor: colors.alert },
});

const textStyles = StyleSheet.create({
  primary: { color: colors.background },
  secondary: { color: colors.text },
  ghost: { color: colors.text },
  danger: { color: colors.text },
});
