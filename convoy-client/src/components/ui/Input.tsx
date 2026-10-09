import { colors, radii, spacing, typography } from "@/theme";
import { forwardRef } from "react";
import {
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from "react-native";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
}

export const Input = forwardRef<TextInput, InputProps>(function Input(
  { label, error, containerStyle, style, ...rest },
  ref,
) {
  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        ref={ref}
        placeholderTextColor={colors.textMuted}
        style={[styles.input, error && styles.inputError, style]}
        {...rest}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  label: {
    ...typography.label,
    color: colors.textMuted,
  },
  input: {
    height: 48,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    backgroundColor: colors.raised,
    borderWidth: 1,
    borderColor: colors.divider,
    color: colors.text,
    fontFamily: typography.body.fontFamily,
    fontSize: 16,
  },
  inputError: {
    borderColor: colors.alert,
  },
  error: {
    ...typography.bodyMuted,
    color: colors.alert,
    fontSize: 13,
  },
});
