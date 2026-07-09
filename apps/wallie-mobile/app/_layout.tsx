import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { AuthProvider } from "@/context/AuthContext";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <StatusBar style="dark" />
        {/* React 19 types from other apps in the monorepo conflict with Expo Router on React 18. */}
        {/* @ts-expect-error monorepo React type mismatch */}
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="login" />
          <Stack.Screen name="chat" />
        </Stack>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
