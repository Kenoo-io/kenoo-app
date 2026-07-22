import { Stack } from "expo-router";

export default function SettingsLayout() {
  return (
    // React 19 types from other apps in the monorepo conflict with Expo Router on React 18.
    // @ts-expect-error monorepo React type mismatch
    <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="theme" />
      <Stack.Screen name="apple-health" />
    </Stack>
  );
}
