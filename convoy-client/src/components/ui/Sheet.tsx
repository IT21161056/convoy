import { colors, radii, spacing, typography } from "@/theme";
import { ReactNode } from "react";
import {
  Modal,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /** Optional max height as a fraction of screen height (0-1). */
  maxHeightRatio?: number;
  style?: StyleProp<ViewStyle>;
}

export function Sheet({
  visible,
  onClose,
  title,
  children,
  maxHeightRatio = 0.85,
  style,
}: SheetProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={onClose} />

      <View
        style={[
          styles.sheet,
          {
            maxHeight: `${maxHeightRatio * 100}%` as unknown as number,
            paddingBottom: insets.bottom,
          },
          style,
        ]}
      >
        <View style={styles.handleWrap}>
          <View style={styles.handle} />
        </View>

        {title ? (
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={12} style={styles.close}>
              <Text style={styles.closeText}>×</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.body}>{children}</View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.panel,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.divider,
  },
  handleWrap: {
    alignItems: "center",
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.divider,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  title: {
    ...typography.h3,
  },
  close: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: {
    ...typography.body,
    fontSize: 22,
    color: colors.textMuted,
  },
  body: {
    flexShrink: 1,
  },
});
