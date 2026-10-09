import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radii, spacing, typography } from "@/theme";

interface MapFloatingControlsProps {
  is3D: boolean;
  onToggle3D: () => void;
  onFitConvoy: () => void;
  onRecenter: () => void;
  showTraffic: boolean;
  onToggleTraffic: () => void;
  heading: number | null;
}

export function MapFloatingControls({
  is3D,
  onToggle3D,
  onFitConvoy,
  onRecenter,
  showTraffic,
  onToggleTraffic,
  heading,
}: MapFloatingControlsProps) {
  const hasHeading = heading !== null && heading !== undefined;

  return (
    <View style={styles.dock}>
      {/* 3D / 2D Perspective Toggle */}
      <Pressable
        onPress={onToggle3D}
        style={({ pressed }) => [
          styles.btn,
          is3D && styles.btnActive,
          pressed && styles.btnPressed,
        ]}
        accessibilityLabel="Toggle 3D View"
      >
        <Text style={[styles.mode3DText, is3D && styles.mode3DTextActive]}>
          {is3D ? "3D" : "2D"}
        </Text>
        <Text style={[styles.subText, is3D && styles.subTextActive]}>
          {is3D ? "Angle" : "Flat"}
        </Text>
      </Pressable>

      <View style={styles.divider} />

      {/* Fit Entire Convoy in Screen */}
      <Pressable
        onPress={onFitConvoy}
        style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
        accessibilityLabel="Fit Convoy in View"
      >
        <Text style={styles.iconGlyph}>⛶</Text>
        <Text style={styles.subText}>Fit</Text>
      </Pressable>

      <View style={styles.divider} />

      {/* Recenter & Compass */}
      <Pressable
        onPress={onRecenter}
        style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
        accessibilityLabel="Recenter Map"
      >
        {hasHeading ? (
          <View
            style={[
              styles.compassWrap,
              { transform: [{ rotate: `${heading}deg` }] },
            ]}
          >
            <Text style={styles.compassArrow}>▲</Text>
          </View>
        ) : (
          <Text style={styles.iconGlyph}>◎</Text>
        )}
        <Text style={styles.subText}>You</Text>
      </Pressable>

      <View style={styles.divider} />

      {/* Traffic Overlay Toggle */}
      <Pressable
        onPress={onToggleTraffic}
        style={({ pressed }) => [
          styles.btn,
          showTraffic && styles.btnActive,
          pressed && styles.btnPressed,
        ]}
        accessibilityLabel="Toggle Traffic Layer"
      >
        <Text style={styles.iconGlyph}>🚦</Text>
        <Text style={[styles.subText, showTraffic && styles.subTextActive]}>
          {showTraffic ? "Live" : "Traffic"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  dock: {
    backgroundColor: "rgba(16, 20, 28, 0.9)",
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    paddingVertical: spacing.xs,
    paddingHorizontal: 4,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 6,
  },
  divider: {
    width: 24,
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    marginVertical: 2,
  },
  btn: {
    width: 44,
    height: 46,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 2,
  },
  btnActive: {
    backgroundColor: "rgba(245, 166, 35, 0.18)",
    borderWidth: 1,
    borderColor: colors.primary,
  },
  btnPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
  iconGlyph: {
    fontSize: 18,
    color: colors.text,
    textAlign: "center",
  },
  mode3DText: {
    fontFamily: typography.h3.fontFamily,
    fontSize: 15,
    fontWeight: "800",
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  mode3DTextActive: {
    color: colors.primary,
  },
  subText: {
    ...typography.label,
    fontSize: 9,
    color: colors.textMuted,
    marginTop: 1,
  },
  subTextActive: {
    color: colors.primary,
    fontWeight: "700",
  },
  compassWrap: {
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  compassArrow: {
    fontSize: 15,
    color: colors.primary,
  },
});
