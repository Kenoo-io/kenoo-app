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
import { useTheme } from "@/context/ThemeContext";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function ThemeToggleButton() {
  const { isDark, colors, toggleTheme } = useTheme();
  const spin = useSharedValue(0);
  const press = useSharedValue(0);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${interpolate(spin.value, [0, 1], [0, 180])}deg` },
      { scale: interpolate(press.value, [0, 1], [1, 0.88]) },
    ],
  }));

  const handlePress = () => {
    spin.value = 0;
    spin.value = withTiming(
      1,
      {
        duration: 520,
        easing: Easing.out(Easing.cubic),
      },
      (finished) => {
        if (finished) {
          spin.value = 0;
        }
      },
    );
    press.value = withSequence(
      withTiming(1, { duration: 90 }),
      withTiming(0, { duration: 220 }),
    );
    toggleTheme();
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={() => {
        press.value = withTiming(1, { duration: 90 });
      }}
      onPressOut={() => {
        press.value = withTiming(0, { duration: 160 });
      }}
      accessibilityRole="button"
      accessibilityLabel={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <GlassSurface
        borderRadius={22}
        intensity={60}
        contentStyle={styles.glassContent}
        style={styles.glass}
      >
        <Animated.View style={iconStyle}>
          <Ionicons
            name={isDark ? "sunny" : "moon"}
            size={20}
            color={isDark ? "#FBBF24" : colors.textMuted}
          />
        </Animated.View>
      </GlassSurface>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  glass: {
    width: 44,
    height: 44,
  },
  glassContent: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
});
