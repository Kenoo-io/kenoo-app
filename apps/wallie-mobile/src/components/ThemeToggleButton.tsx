import { useCallback, useRef } from "react";
import { Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { GlassSurface } from "@/components/GlassSurface";
import { darkColors, lightColors } from "@/constants/theme";
import { useTheme } from "@/context/ThemeContext";
import { useThemeWipe } from "@/context/ThemeWipeContext";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const SPIN_MS = 720;

export type ThemeWipeRequest = {
  nextIsDark: boolean;
  background: string;
};

interface ThemeToggleButtonProps {
  /** Landing-screen cinematic wipe. Parent owns the overlay + theme commit. */
  onCinematicToggle?: (request: ThemeWipeRequest) => void;
  disabled?: boolean;
}

export function ThemeToggleButton({
  onCinematicToggle,
  disabled = false,
}: ThemeToggleButtonProps) {
  const { isDark, colors, toggleTheme } = useTheme();
  const wipe = useThemeWipe();
  const spin = useSharedValue(0);
  const press = useSharedValue(0);
  const isBusyRef = useRef(false);

  const finishBusy = useCallback(() => {
    isBusyRef.current = false;
  }, []);

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(press.value, [0, 1], [1, 0.88]) }],
  }));

  const iconWrapStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${interpolate(spin.value, [0, 1], [0, 360])}deg` },
    ],
  }));

  // Old icon fades out on top; destination stays as the stable base underneath
  // so teardown never swaps layers (that was the post-wipe moon flash).
  const fromOverlayStyle = useAnimatedStyle(() => {
    if (!wipe?.active) {
      return { opacity: 0 };
    }

    return {
      opacity: interpolate(
        wipe.progress.value,
        [0, 0.45, 0.55, 1],
        [1, 1, 0, 0],
      ),
    };
  }, [wipe]);

  const handlePress = () => {
    if (disabled || isBusyRef.current) return;

    isBusyRef.current = true;
    spin.value = 0;
    spin.value = withTiming(1, {
      duration: SPIN_MS,
      easing: Easing.out(Easing.cubic),
    });
    press.value = withSequence(
      withTiming(1, { duration: 90 }),
      withTiming(0, { duration: 220 }),
    );

    if (onCinematicToggle) {
      const nextIsDark = !isDark;
      onCinematicToggle({
        nextIsDark,
        background: nextIsDark
          ? darkColors.background
          : lightColors.background,
      });
      setTimeout(finishBusy, SPIN_MS + 80);
      return;
    }

    toggleTheme();
    setTimeout(finishBusy, SPIN_MS);
  };

  const settledName = isDark ? "sunny" : "moon";
  const settledColor = isDark ? colors.text : colors.textMuted;

  const baseName = wipe?.active
    ? wipe.toDark
      ? "sunny"
      : "moon"
    : settledName;
  const baseColor = wipe?.active
    ? wipe.toDark
      ? wipe.toColors.text
      : wipe.toColors.textMuted
    : settledColor;

  const fromName = wipe?.active
    ? wipe.fromDark
      ? "sunny"
      : "moon"
    : settledName;
  const fromColor = wipe?.active
    ? wipe.fromDark
      ? wipe.fromColors.text
      : wipe.fromColors.textMuted
    : settledColor;

  return (
    <AnimatedPressable
      onPress={handlePress}
      disabled={disabled}
      onPressIn={() => {
        if (disabled) return;
        press.value = withTiming(1, { duration: 90 });
      }}
      onPressOut={() => {
        press.value = withTiming(0, { duration: 160 });
      }}
      accessibilityRole="button"
      accessibilityLabel={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <GlassSurface
        borderRadius={24}
        intensity={60}
        contentStyle={styles.glassContent}
        style={styles.glass}
      >
        <Animated.View style={pressStyle}>
          <Animated.View style={[styles.iconStack, iconWrapStyle]}>
            <Ionicons name={baseName} size={22} color={baseColor} />
            {wipe?.active ? (
              <Animated.View style={[styles.iconLayer, fromOverlayStyle]}>
                <Ionicons name={fromName} size={22} color={fromColor} />
              </Animated.View>
            ) : null}
          </Animated.View>
        </Animated.View>
      </GlassSurface>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  glass: {
    width: 48,
    height: 48,
  },
  glassContent: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  iconStack: {
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  iconLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
});
