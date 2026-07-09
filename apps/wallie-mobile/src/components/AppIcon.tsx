import { Text, type TextStyle } from "react-native";

import { colors } from "@/constants/theme";

const ICONS = {
  menu: "☰",
  logout: "⎋",
  close: "✕",
  send: "↑",
  mic: "🎤",
  micActive: "●",
} as const;

type IconName = keyof typeof ICONS;

interface AppIconProps {
  name: IconName;
  size?: number;
  color?: string;
  style?: TextStyle;
}

export function AppIcon({
  name,
  size = 20,
  color = colors.text,
  style,
}: AppIconProps) {
  return (
    <Text style={[{ fontSize: size, color, lineHeight: size + 2 }, style]}>
      {ICONS[name]}
    </Text>
  );
}
