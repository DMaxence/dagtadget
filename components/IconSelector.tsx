import React from "react";
import { View, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useThemeColor } from "@/hooks/useThemeColor";

// Icon names chosen for their similarity to common SF Symbols
// You can expand this list based on your needs.
// Ensure these names can be mapped to actual SF Symbols in your Swift code.
const AVAILABLE_ICONS: string[] = [
  "star",
  "heart",
  "home",
  "settings",
  "person",
  "time",
  "calendar",
  "briefcase",
  "airplane",
  "alarm",
  "archive",
  "at",
  "barcode",
  "battery-full",
  "book",
  "bookmark",
  "build",
  "camera",
  "cart",
  "chatbubble",
  "checkmark-circle",
  "cloud",
  "code",
  "cog",
  "compass",
  "document",
  "download",
  "earth",
  "eye",
  "folder",
  "gift",
  "globe",
  "information-circle",
  "key",
  "link",
  "location",
  "lock-closed",
  "mail",
  "map",
  "moon",
  "notifications",
  "pencil",
  "pie-chart",
  "pin",
  "print",
  "pulse",
  "receipt",
  "refresh",
  "remove-circle",
  "scan",
  "search",
  "send",
  "share",
  "shield",
  "stats-chart",
  "stopwatch",
  "sunny",
  "sync",
  "trash",
  "trending-up",
  "trophy",
  "umbrella",
  "volume-high",
  "wallet",
  "wifi",
  "pricetag", // for tags/labels
  "flag", // for flags/milestones
  "car-sport", // for travel/car related
  "fitness", // for health/fitness
  "game-controller", // for games/leisure
  "headset", // for music/audio
  "school", // for education
  "lightbulb", // for ideas
  "nutrition", // for food/diet
  "paw", // for pets
  "leaf", // for nature/environment
];

interface IconSelectorProps {
  selectedIcon: string;
  onSelectIcon: (iconName: string) => void;
}

export const IconSelector: React.FC<IconSelectorProps> = ({
  selectedIcon,
  onSelectIcon,
}) => {
  const iconColor = useThemeColor({ light: "#303030", dark: "#e0e0e0" }, "text");
  const selectedIconColor = useThemeColor({ light: "#0070f3", dark: "#3694ff" }, "tint");
  const iconBackgroundColor = useThemeColor({ light: "#f0f0f0", dark: "#2c2c2c" }, "background");
  const selectedIconBackgroundColor = useThemeColor({ light: "#e0efff", dark: "#1a3d5f" }, "background");
  const labelColor = useThemeColor({ light: "#505050", dark: "#b0b0b0" }, "text");

  return (
    <View style={styles.container}>
      <ThemedText style={[styles.label, { color: labelColor }]}>Icon</ThemedText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.iconGrid}>
          {AVAILABLE_ICONS.map((iconName) => (
            <TouchableOpacity
              key={iconName}
              style={[
                styles.iconButton,
                { 
                  backgroundColor: iconName === selectedIcon ? selectedIconBackgroundColor : iconBackgroundColor,
                  borderColor: iconName === selectedIcon ? selectedIconColor : iconBackgroundColor,
                },
              ]}
              onPress={() => onSelectIcon(iconName)}
            >
              <Ionicons
                name={iconName as any} // Cast to any as Ionicons names are specific
                size={28}
                color={iconName === selectedIcon ? selectedIconColor : iconColor}
              />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  label: {
    marginBottom: 12,
    fontWeight: "600",
    fontSize: 15,
  },
  iconGrid: {
    flexDirection: "row",
    flexWrap: "nowrap", // Keep icons in a single scrollable row
  },
  iconButton: {
    width: 60,
    height: 60,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    borderWidth: 2,
  },
}); 