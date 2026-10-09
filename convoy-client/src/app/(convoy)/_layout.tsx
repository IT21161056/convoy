import { colors } from "@/theme";
import { Stack } from "expo-router";

export default function ConvoyLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: "slide_from_right",
      }}
    />
  );
}

