import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  interpolateColor,
  useAnimatedStyle,
} from "react-native-reanimated";

import { useTheme } from "@/context/ThemeContext";
import { useThemeWipe } from "@/context/ThemeWipeContext";

interface GlassSurfaceProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  borderRadius?: number;
  /** Kept for call-site compatibility; blur removed to avoid iOS theme flashes. */
  intensity?: number;
  elevated?: boolean;
}

export function GlassSurface({
  children,
  style,
  contentStyle,
  borderRadius = 20,
  elevated = false,
}: GlassSurfaceProps) {
  const { colors } = useTheme();
  const wipe = useThemeWipe();

  // Opaque shell + tint only. BlurView was flashing intermittently on theme
  // changes when the backdrop swapped under it.
  const shellStyle = useAnimatedStyle(() => {
    if (wipe?.active) {
      return {
        backgroundColor: interpolateColor(
          wipe.progress.value,
          [0, 1],
          [wipe.fromColors.surface, wipe.toColors.surface],
        ),
      };
    }

    return { backgroundColor: colors.surface };
  }, [colors.surface, wipe]);

  const tintStyle = useAnimatedStyle(() => {
    if (wipe?.active) {
      return {
        backgroundColor: interpolateColor(
          wipe.progress.value,
          [0, 1],
          [wipe.fromColors.glassTint, wipe.toColors.glassTint],
        ),
        borderColor: interpolateColor(
          wipe.progress.value,
          [0, 1],
          [wipe.fromColors.glassBorder, wipe.toColors.glassBorder],
        ),
      };
    }

    return {
      backgroundColor: colors.glassTint,
      borderColor: colors.glassBorder,
    };
  }, [colors.glassBorder, colors.glassTint, wipe]);

  return (
    <Animated.View
      style={[
        elevated ? styles.shadowElevated : styles.shadow,
        {
          borderRadius,
          shadowColor: wipe?.active
            ? wipe.toColors.shadowColor
            : colors.shadowColor,
        },
        shellStyle,
        style,
      ]}
    >
      <View style={[styles.clip, { borderRadius }]}>
        <Animated.View
          style={[styles.tint, { borderRadius }, tintStyle, contentStyle]}
        >
          {children}
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  shadow: {
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 10,
  },
  shadowElevated: {
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 28,
    elevation: 14,
  },
  clip: {
    overflow: "hidden",
  },
  tint: {
    borderWidth: 1,
    overflow: "hidden",
  },
});
