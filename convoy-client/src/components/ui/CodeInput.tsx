import { colors, radii, spacing, typography } from "@/theme";
import { forwardRef } from "react";
import { StyleSheet, TextInput, TextInputProps, View } from "react-native";

interface CodeInputProps extends TextInputProps {
  length?: number;
}

export const CodeInput = forwardRef<TextInput, CodeInputProps>(
  function CodeInput({ length = 5, style, onChangeText, value, ...rest }, ref) {
    return (
      <View style={styles.container}>
        <TextInput
          ref={ref}
          value={value}
          onChangeText={(text) => {
            const cleaned = text
              .toUpperCase()
              .replace(/[^A-Z0-9]/g, "")
              .slice(0, length);
            onChangeText?.(cleaned);
          }}
          maxLength={length}
          autoCapitalize="characters"
          autoCorrect={false}
          placeholder={"•".repeat(length)}
          placeholderTextColor={colors.divider}
          style={[styles.input, style]}
          {...rest}
        />
      </View>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  input: {
    width: "100%",
    height: 72,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.divider,
    color: colors.primary,
    fontFamily: typography.h1.fontFamily,
    fontSize: 34,
    letterSpacing: 12,
    textAlign: "center",
  },
});
