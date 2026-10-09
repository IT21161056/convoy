import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { usePushToTalk } from "@/features/pushToTalk";
import { HoldToTalkButton, type HoldToTalkState } from "./HoldToTalkButton";

interface PttControlProps {
  ptt: ReturnType<typeof usePushToTalk>;
  allowed: boolean;
  onSend: (
    rec: NonNullable<ReturnType<typeof usePushToTalk>["lastRecording"]>,
  ) => void;
  onError: (msg: string) => void;
}

export function PttControl({
  ptt,
  allowed,
  onSend,
  onError,
}: PttControlProps) {
  useEffect(() => {
    if (ptt.lastError) onError(ptt.lastError);
  }, [ptt.lastError, onError]);

  // Auto-send when recording becomes ready
  useEffect(() => {
    if (ptt.state === "ready" && ptt.lastRecording) {
      onSend(ptt.lastRecording);
    }
  }, [ptt.state, ptt.lastRecording, onSend]);

  let buttonState: HoldToTalkState = "idle";
  if (!allowed) {
    buttonState = "disabled";
  } else if (ptt.state === "recording") {
    buttonState = "recording";
  }

  return (
    <View style={styles.container}>
      <HoldToTalkButton
        state={buttonState}
        maxDurationMs={30_000}
        disabledReason={!allowed ? "Restricted to host" : undefined}
        onPressStart={() => void ptt.start()}
        onPressEnd={() => void ptt.stop()}
        onLimitReached={() => void ptt.stop()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
});

export default PttControl;
