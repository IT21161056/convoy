import { colors, spacing } from "@/theme";
import { ReactNode } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface ScreenProps {
  children: ReactNode;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Screen({ children, padded = true, style }: ScreenProps) {
  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={[styles.inner, padded && styles.padded, style]}>
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  inner: {
    flex: 1,
  },
  padded: {
    paddingHorizontal: spacing.xl,
  },
});
