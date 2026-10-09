import { useConvoy } from "@/features/convoy";
import { colors } from "@/theme";
import { Stack, router } from "expo-router";
import { useEffect } from "react";

export default function ConvoyLayout() {
  const convoy = useConvoy();

  useEffect(() => {
    if (!convoy) {
      router.replace("/(welcome)");
    }
  }, [convoy]);

  if (!convoy) return null;

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
