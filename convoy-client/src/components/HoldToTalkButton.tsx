import React, { useEffect, useRef, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  Vibration,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { DRIVER_UI_RULES } from "@/utils/constants";
import { colors, radii, spacing, typography } from "@/theme";

export type HoldToTalkState = "idle" | "recording" | "disabled" | "sending";

/**
 * ============================================================================
 * Custom Component: HoldToTalkButton (SE5070 Requirement §8 & §17.1)
 * ============================================================================
 * Large, driver-safe Push-to-Talk (PTT) voice broadcast control.
 *
 * PROPS:
 * - state: 'idle' | 'recording' | 'disabled' | 'sending'
 * - maxDurationMs: Hard limit before recording auto-stops (e.g. 30,000ms)
 * - disabledReason?: Optional explanation displayed to user (e.g. "Offline")
 * - size?: Diameter of the circular button (default 120dp for driver safety)
 *
 * EVENTS:
 * - onPressStart: Fired immediately when press begins; initiates microphone recording
 * - onPressEnd: Fired when user releases button; returns elapsed recording duration
 * - onLimitReached: Fired when timer reaches maxDurationMs; forces recording stop
 * - onCancel: Fired if press is interrupted or cancelled
 * ============================================================================
 */
export interface HoldToTalkButtonProps {
  state: HoldToTalkState;
  maxDurationMs?: number;
  disabledReason?: string;
  size?: number;
  onPressStart: () => void;
  onPressEnd: (durationMs: number) => void;
  onLimitReached?: () => void;
  onCancel?: () => void;
}

export function HoldToTalkButton({
  state,
  maxDurationMs = 30_000,
  disabledReason,
  size = DRIVER_UI_RULES.PTT_BUTTON_SIZE_DP,
  onPressStart,
  onPressEnd,
  onLimitReached,
  onCancel,
}: HoldToTalkButtonProps) {
  const [elapsedMs, setElapsedMs] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isRecording = state === "recording";
  const isDisabled = state === "disabled";
  const isSending = state === "sending";

  // Reanimated pulsating ring animation during active recording
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.6);

  useEffect(() => {
    if (isRecording) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.22, { duration: 600 }),
          withTiming(1.0, { duration: 600 }),
        ),
        -1,
        true,
      );
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.2, { duration: 600 }),
          withTiming(0.7, { duration: 600 }),
        ),
        -1,
        true,
      );
    } else {
      pulseScale.value = withTiming(1, { duration: 200 });
      pulseOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [isRecording, pulseOpacity, pulseScale]);

  const animatedPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  // Active recording timer loop & maxDuration check
  useEffect(() => {
    if (isRecording) {
      startTimeRef.current = Date.now();
      setElapsedMs(0);

      timerRef.current = setInterval(() => {
        if (!startTimeRef.current) return;
        const currentElapsed = Date.now() - startTimeRef.current;
        setElapsedMs(currentElapsed);

        if (currentElapsed >= maxDurationMs) {
          if (timerRef.current) clearInterval(timerRef.current);
          Vibration.vibrate(50);
          onLimitReached?.();
        }
      }, 100);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
      startTimeRef.current = null;
      setElapsedMs(0);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording, maxDurationMs, onLimitReached]);

  // Press handlers with haptic feedback
  const handlePressIn = () => {
    if (isDisabled || isSending) return;
    Vibration.vibrate(25);
    onPressStart();
  };

  const handlePressOut = () => {
    if (isDisabled || isSending) return;
    const finalDuration = startTimeRef.current
      ? Date.now() - startTimeRef.current
      : elapsedMs;
    Vibration.vibrate(20);
    onPressEnd(finalDuration);
  };

  return (
    <View style={styles.container}>
      {/* Outer pulsating ring for active recording feedback */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.pulseRing,
          {
            width: size + 28,
            height: size + 28,
            borderRadius: (size + 28) / 2,
            backgroundColor: isRecording ? colors.alert : "transparent",
          },
          animatedPulseStyle,
        ]}
      />

      {/* Main Touch Button */}
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled || isSending}
        style={({ pressed }) => [
          styles.button,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: isRecording
              ? colors.alert
              : isDisabled
                ? colors.panel
                : colors.primary,
            borderColor: isRecording ? "#FF8E92" : colors.raised,
          },
          pressed && !isDisabled && styles.buttonPressed,
          isDisabled && styles.buttonDisabled,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Push to talk"
        accessibilityHint="Hold to record voice message for the convoy"
      >
        <Text style={styles.icon}>
          {isRecording ? "🔴" : isSending ? "⏳" : isDisabled ? "🔇" : "🎙"}
        </Text>
        <Text style={styles.buttonLabel}>
          {isRecording
            ? formatTimer(elapsedMs)
            : isSending
              ? "SENDING"
              : isDisabled
                ? "MUTED"
                : "HOLD TO TALK"}
        </Text>
      </Pressable>

      {/* Secondary glanceable status label */}
      <View style={styles.labelRow}>
        {isDisabled && disabledReason ? (
          <Text style={styles.disabledText}>{disabledReason}</Text>
        ) : isRecording ? (
          <Text style={styles.recordingText}>Release to broadcast</Text>
        ) : (
          <Text style={styles.idleHint}>Broadcasts to entire convoy</Text>
        )}
      </View>
    </View>
  );
}

function formatTimer(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const tenths = Math.floor((ms % 1000) / 100);
  return `0:${totalSec.toString().padStart(2, "0")}.${tenths}`;
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: spacing.sm,
  },
  pulseRing: {
    position: "absolute",
  },
  button: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  buttonPressed: {
    transform: [{ scale: 0.94 }],
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  icon: {
    fontSize: 34,
    marginBottom: 4,
  },
  buttonLabel: {
    ...typography.label,
    color: colors.text,
    fontSize: 12,
    letterSpacing: 1.2,
    fontWeight: "700",
  },
  labelRow: {
    marginTop: spacing.sm,
    alignItems: "center",
    height: 18,
  },
  disabledText: {
    ...typography.bodyMuted,
    fontSize: 12,
    color: colors.alert,
  },
  recordingText: {
    ...typography.body,
    fontSize: 12,
    color: colors.alert,
    fontWeight: "600",
  },
  idleHint: {
    ...typography.bodyMuted,
    fontSize: 12,
    color: colors.textMuted,
  },
});
