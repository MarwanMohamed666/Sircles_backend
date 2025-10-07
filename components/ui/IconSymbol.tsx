import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { SymbolWeight } from "expo-symbols";
import { ComponentProps } from "react";
import {
  OpaqueColorValue,
  type StyleProp,
  type TextStyle,
  Platform,
} from "react-native";

type IconMapping = Record<
  string,
  { name: string; lib?: "MaterialIcons" | "MaterialCommunityIcons" }
>;

const MAPPING: IconMapping = {
  // Navigation Icons
  "house.fill": { name: "home" },
  house: { name: "home" },

 
  "house.badge.plus": {
    name: "home-plus-outline",
    lib: "MaterialCommunityIcons",
  },

  "person.circle": { name: "account-circle" },
  "person.circle.fill": { name: "account-circle" },
  bell: { name: "notifications" },
  "bell.fill": { name: "notifications" },
  calendar: { name: "event" },
  "calendar.fill": { name: "event" },
  message: { name: "chat" },
  "message.fill": { name: "chat" },

  magnifyingglass: { name: "magnify", lib: "MaterialCommunityIcons" },

  ellipsis: { name: "dots-horizontal", lib: "MaterialCommunityIcons" },
  "ellipsis.bubble": {
    name: "chat-processing-outline",
    lib: "MaterialCommunityIcons",
  },

  "person.3": { name: "group" },
  "person.3.fill": { name: "group" },

  // Action Icons
  plus: { name: "add" },
  "plus.circle": { name: "add-circle" },
  "plus.circle.fill": { name: "add-circle" },
  "paperplane.fill": { name: "send" },
  heart: { name: "favorite-border" },
  "heart.fill": { name: "favorite" },
  "bubble.left": { name: "comment" },
  "bubble.left.fill": { name: "comment" },
  share: { name: "share" },
  location: { name: "location-on" },
  "location.fill": { name: "location-on" },
  clock: { name: "schedule" },
  "minus.circle": { name: "cancel" },

  "clock.fill": { name: "schedule" },
  "line.3.horizontal.decrease.circle": { name: "tune" },

  // Navigation Arrows
  "chevron.left": { name: "chevron-left" },
  "chevron.right": { name: "chevron-right" },
  "chevron.up": { name: "keyboard-arrow-up" },
  "chevron.down": { name: "keyboard-arrow-down" },
  "arrow.left": { name: "arrow-back" },
  "arrow.right": { name: "arrow-forward" },

  // Settings & Profile Icons
  gear: { name: "settings" },
  "gear.fill": { name: "settings" },
  person: { name: "person" },
  "person.fill": { name: "person" },
  photo: { name: "photo" },
  "photo.fill": { name: "photo" },
  camera: { name: "camera-alt" },
  "camera.fill": { name: "camera-alt" },
  eye: { name: "visibility" },
  "eye.slash": { name: "visibility-off" },
  lock: { name: "lock" },
  "lock.fill": { name: "lock" },
  key: { name: "vpn-key" },
  "key.fill": { name: "vpn-key" },

  // Additional Action Icons
  pencil: { name: "edit" },
  trash: { name: "delete" },
  globe: { name: "public" },
  xmark: { name: "close" },
  "square.and.arrow.up": { name: "share" },

  // Content Icons
  tag: { name: "local-offer" },
  "tag.fill": { name: "local-offer" },
  star: { name: "star-border" },
  "star.fill": { name: "star" },
  doc: { name: "description" },
  "doc.fill": { name: "description" },
  folder: { name: "folder" },
  "folder.fill": { name: "folder" },

  // Other Common Icons
  "ellipsis.vertical": { name: "dots-vertical", lib: "MaterialCommunityIcons" },
  "xmark.circle": { name: "cancel" },
  "checkmark.circle": { name: "check-circle" },
  info: { name: "info" },
  exclamationmark: { name: "warning" },
  "exclamationmark.triangle": { name: "warning" },
  moon: { name: "brightness-3" },
  "sun.max": { name: "brightness-7" },
  shield: { name: "security" },
  "chart.bar": { name: "bar-chart" },
  "chart.line.uptrend.xyaxis": { name: "trending-up" },
  "person.badge.shield": { name: "admin-panel-settings" },
  "chevron.left.forwardslash.chevron.right": { name: "code" },
};

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
  weight,
}: {
  name: string;
  size?: number;
  color?: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  if (Platform.OS === "ios") {
    try {
      const { SymbolView } = require("expo-symbols");
      return (
        <SymbolView
          name={name}
          size={size}
          tintColor={color}
          style={style}
          weight={weight}
        />
      );
    } catch {}
  }

  const mapped = MAPPING[name as keyof typeof MAPPING];
  const iconLib = mapped?.lib || "MaterialIcons";
  const iconName = mapped?.name || "help-outline";

  if (iconLib === "MaterialCommunityIcons") {
    return (
      <MaterialCommunityIcons
        name={iconName}
        size={size}
        color={color || "#000"}
        style={style}
      />
    );
  }

  return (
    <MaterialIcons
      name={iconName}
      size={size}
      color={color || "#000"}
      style={style}
      suppressHighlighting={true}
    />
  );
}