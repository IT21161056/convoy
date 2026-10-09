import React from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import { colors, radii, spacing, typography } from '@/theme';

interface QuickAccessRowProps {
  onChatPress: () => void;
  chatUnread?: number;
}

export function QuickAccessRow({
  onChatPress,
  chatUnread = 0,
}: QuickAccessRowProps) {
  return (
    <View style={styles.row}>
      <QuickAccessButton
        icon="💬"
        label="Group Chat"
        badge={chatUnread > 0 ? chatUnread : undefined}
        onPress={onChatPress}
      />
    </View>
  );
}

function QuickAccessButton({
  icon,
  label,
  badge,
  live,
  onPress,
}: {
  icon: string;
  label: string;
  badge?: number;
  live?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <View style={styles.iconWrap}>
        <Text style={styles.icon}>{icon}</Text>

        {badge !== undefined ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {badge > 9 ? '9+' : badge}
            </Text>
          </View>
        ) : null}

        {live ? <View style={styles.liveDot} /> : null}
      </View>

      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.raised,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  pressed: { opacity: 0.75 },
  iconWrap: {
    position: 'relative',
  },
  icon: {
    fontSize: 18,
  },
  label: {
    ...typography.body,
    fontSize: 15,
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: colors.alert,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    ...typography.label,
    color: colors.text,
    fontSize: 11,
    lineHeight: 14,
  },
  liveDot: {
    position: 'absolute',
    top: -4,
    right: -6,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.connected,
    borderWidth: 2,
    borderColor: colors.raised,
  },
});