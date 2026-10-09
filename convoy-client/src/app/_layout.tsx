import { ToastProvider } from "@/components/ui";
import { useChatSync } from "@/features/chat";
import { useSocketLifecycle } from "@/features/connection";
import { useLocationBroadcast } from "@/features/location";
import { useMemberSync } from "@/features/members";
import { usePttSync } from "@/features/pushToTalk";
import { colors } from "@/theme";
import {
  BarlowCondensed_600SemiBold,
  BarlowCondensed_700Bold,
  useFonts,
} from "@expo-google-fonts/barlow-condensed";
import {
  IBMPlexSans_400Regular,
  IBMPlexSans_500Medium,
} from "@expo-google-fonts/ibm-plex-sans";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded] = useFonts({
    BarlowCondensed_600SemiBold,
    BarlowCondensed_700Bold,
    IBMPlexSans_400Regular,
    IBMPlexSans_500Medium,
  });

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <ToastProvider>
        <SocketLifecycle />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
            animation: "fade",
          }}
        />
      </ToastProvider>
    </GestureHandlerRootView>
  );
}

function SocketLifecycle() {
  useSocketLifecycle();
  useMemberSync();
  useLocationBroadcast();
  useChatSync();
  usePttSync();
  return null;
}
