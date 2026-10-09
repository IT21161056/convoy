import { BackButton, Button } from "@/components/ui";
import { convoyCommands } from "@/features/convoy";
import { getItem, STORAGE_KEYS } from "@/services/storage";
import { colors, radii, spacing, typography } from "@/theme";
import { CameraView, useCameraPermissions } from "expo-camera";
import { router, Stack } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";




export default function ScanQRScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [joining, setJoining] = useState(false);
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [torch, setTorch] = useState(false);
  const lockRef = useRef(false);

  useEffect(() => {
    if (!permission) return;
    if (!permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  const handleScanned = ({ data }: { data: string }) => {
    if (lockRef.current) return;
    lockRef.current = true;
    setScanned(true);

    const code = extractCode(data);

    if (!code) {
      setError("That doesn't look like a Convoy QR code.");
      setTimeout(() => {
        lockRef.current = false;
        setScanned(false);
        setError(null);
      }, 2000);
      return;
    }

    setScannedCode(code);
    setJoining(true);

    void (async () => {
      try {
        const savedName = await getItem<string>(STORAGE_KEYS.userName);
        if (savedName) {
          await convoyCommands.join({ code, name: savedName });
          router.replace("/(convoy)/lobby");
        } else {
          router.replace({ pathname: "/(welcome)/join/code", params: { code } });
        }
      } catch (err) {
        setJoining(false);
        setError(err instanceof Error ? err.message : "Failed to join convoy");
        setTimeout(() => {
          lockRef.current = false;
          setScanned(false);
          setScannedCode(null);
          setError(null);
        }, 2200);
      }
    })();
  };

  // No permission determined yet
  if (!permission) {
    return <View style={styles.container} />;
  }

  // Permission denied
  if (!permission.granted) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
          <View style={styles.permissionBody}>
            <Text style={styles.permissionTitle}>Camera access needed</Text>
            <Text style={styles.permissionText}>
              Convoy uses your camera only to scan convoy QR codes.
            </Text>
            {permission.canAskAgain ? (
              <Button label="Allow Camera" onPress={requestPermission} />
            ) : (
              <Text style={styles.permissionText}>
                Enable camera access from your device settings.
              </Text>
            )}
            <Button
              label="Enter Code Instead"
              variant="secondary"
              onPress={() => router.replace("/(welcome)/join/code")}
            />
          </View>
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          enableTorch={torch}
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          onBarcodeScanned={scanned ? undefined : handleScanned}
        />

        {/* Viewfinder overlay */}
        <View style={styles.overlay} pointerEvents="none">
          <View style={styles.overlayTop} />
          <View style={styles.overlayMiddle}>
            <View style={styles.overlaySide} />
            <View style={styles.frame}>
              {/* Corner brackets */}
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />

              {joining ? (
                <View style={styles.joiningOverlay}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={styles.joiningText}>
                    Joining {scannedCode}…
                  </Text>
                </View>
              ) : null}
            </View>
            <View style={styles.overlaySide} />
          </View>
          <View style={styles.overlayBottom}>
            <Text style={styles.hint}>
              {joining ? "Connecting to convoy..." : "Point at the host's QR code"}
            </Text>
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </View>
        </View>

        <SafeAreaView style={styles.topBar} edges={["top"]}>
          <BackButton
            variant="close"
            onPress={() => router.back()}
            accessibilityLabel="Close scanner"
          />


          <Pressable
            onPress={() => setTorch((t) => !t)}
            hitSlop={12}
            style={[styles.iconButton, torch && styles.iconButtonActive]}
          >
            <Text style={styles.iconButtonText}>{torch ? "⚡" : "💡"}</Text>
          </Pressable>
        </SafeAreaView>

        <SafeAreaView style={styles.bottomBar} edges={["bottom"]}>
          <Button
            label="Enter Code Instead"
            variant="secondary"
            onPress={() => router.replace("/(welcome)/join/code")}
          />
        </SafeAreaView>
      </View>
    </>
  );
}

export function extractCode(raw: string): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();

  // 1. Direct 5-char alphanumeric code
  if (/^[A-Z0-9]{5}$/i.test(trimmed)) {
    return trimmed.toUpperCase();
  }

  // 2. Invite URL pattern (/invite/8K4P7)
  const inviteMatch = trimmed.match(/invite\/([A-Z0-9]{5})(?:[\/\?#]|$)/i);
  if (inviteMatch) {
    return inviteMatch[1].toUpperCase();
  }

  // 3. Custom scheme pattern (convoy://8K4P7 or convoynew://8K4P7)
  const schemeMatch = trimmed.match(/convoy(?:new)?:\/\/([A-Z0-9]{5})(?:[\/\?#]|$)/i);
  if (schemeMatch) {
    return schemeMatch[1].toUpperCase();
  }

  // 4. Query param (?code=8K4P7) or labeled (code: 8K4P7)
  const queryOrLabelMatch = trimmed.match(
    /(?:[?&]code=|[Cc]ode:?\s*)([A-Z0-9]{5})(?:[&]|\s|$)/,
  );
  if (queryOrLabelMatch) {
    return queryOrLabelMatch[1].toUpperCase();
  }

  // 5. Look for alphanumeric code with at least one number and letter (e.g. 8K4P7)
  const codeWordMatch = trimmed.match(
    /\b(?=[A-Z0-9]*[0-9])(?=[A-Z0-9]*[A-Z])[A-Z0-9]{5}\b/i,
  );
  if (codeWordMatch) {
    return codeWordMatch[0].toUpperCase();
  }

  return null;
}

const FRAME_SIZE = 260;
const CORNER_SIZE = 24;
const CORNER_THICKNESS = 3;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
  },
  overlayTop: {
    flex: 1,
    backgroundColor: colors.overlay,
  },
  overlayMiddle: {
    flexDirection: "row",
    height: FRAME_SIZE,
  },
  overlaySide: {
    flex: 1,
    backgroundColor: colors.overlay,
  },
  frame: {
    width: FRAME_SIZE,
    height: FRAME_SIZE,
    borderRadius: radii.md,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  corner: {
    position: "absolute",
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: colors.primary,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderTopLeftRadius: radii.md,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderTopRightRadius: radii.md,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderBottomLeftRadius: radii.md,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderBottomRightRadius: radii.md,
  },
  joiningOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(16, 19, 26, 0.85)",
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
  joiningText: {
    ...typography.body,
    color: colors.text,
    fontSize: 16,
  },
  overlayBottom: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: "center",
    paddingTop: spacing.xl,
    gap: spacing.sm,
  },
  hint: {
    ...typography.body,
    color: colors.text,
  },
  error: {
    ...typography.bodyMuted,
    color: colors.alert,
    textAlign: "center",
    paddingHorizontal: spacing.xl,
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    backgroundColor: "rgba(16, 19, 26, 0.8)",
    borderWidth: 1,
    borderColor: colors.divider,
    alignItems: "center",
    justifyContent: "center",
  },
  iconButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  iconButtonText: {
    fontSize: 18,
    color: colors.text,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  permissionBody: {
    flex: 1,
    padding: spacing.xl,
    justifyContent: "center",
    gap: spacing.lg,
  },
  permissionTitle: {
    ...typography.h2,
  },
  permissionText: {
    ...typography.bodyMuted,
    fontSize: 15,
  },
});
