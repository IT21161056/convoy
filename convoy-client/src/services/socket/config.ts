import Constants from "expo-constants";
import { Platform } from "react-native";


function resolveDevUrl(): string {
  if (process.env.EXPO_PUBLIC_SOCKET_URL) {
    return process.env.EXPO_PUBLIC_SOCKET_URL;
  }

  const PORT = 4000;

  // Expo provides the Metro host — reuse it for our server.
  const hostUri =
    Constants.expoConfig?.hostUri ??
    (Constants.manifest2 as any)?.extra?.expoGo?.debuggerHost ??
    null;

  if (hostUri) {
    const host = hostUri.split(":")[0];
    return `http://${host}:${PORT}`;
  }

  if (Platform.OS === "android") {
    // Android emulator loopback alias to host machine
    return `http://10.0.2.2:${PORT}`;
  }
  return `http://localhost:${PORT}`;
}

export const SOCKET_URL = resolveDevUrl();// add your ngrok public URL when build this app
