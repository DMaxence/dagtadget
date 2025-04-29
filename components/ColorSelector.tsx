import React from 'react';
import { 
  StyleSheet, 
  View, 
  TouchableOpacity, 
  ScrollView, 
  Platform 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from "./ThemedText";
import { useThemeColor } from "@/hooks/useThemeColor";
import { t } from "@/constants/i18n";

interface ColorSelectorProps {
  selectedColor: string;
  onSelectColor: (color: string) => void;
}

// Array of widget color options matching iOS style
export const COLOR_OPTIONS = [
  '#33c759', // green
  '#5e5ce6', // purple-blue gradient
  '#ff375f', // pink
  '#ff9f0a', // orange
  '#00c7be', // teal
  '#ff2d55', // red
  '#5856d6', // purple
  '#34c759', // bright green
  '#af52de', // magenta
  '#ff9500', // golden
  '#32ade6', // blue
  '#007aff', // deep blue
  '#ff3b30', // coral
  '#5ac8fa', // light blue
  '#ffcc00', // yellow
];

export function ColorSelector({ selectedColor, onSelectColor }: ColorSelectorProps) {
  const backgroundColor = useThemeColor(
    { light: "#ffffff", dark: "#1c1c1e" },
    "background"
  );
  const borderColor = useThemeColor(
    { light: "#e0e0e0", dark: "#38383a" },
    "background"
  );
  
  return (
    <View style={[styles.container, { backgroundColor, borderColor }]}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Ionicons name="color-palette-outline" size={24} color="#33c759" />
        </View>
        <ThemedText style={styles.title}>{t("widget.create.colorLabel")}</ThemedText>
      </View>
      
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.colorList}
      >
        {COLOR_OPTIONS.map((color) => (
          <TouchableOpacity
            key={color}
            style={[
              styles.colorOption,
              { backgroundColor: color },
              selectedColor === color && styles.selectedColorOption,
            ]}
            onPress={() => onSelectColor(color)}
            activeOpacity={0.8}
          >
            {selectedColor === color && (
              <View style={styles.checkmark}>
                <Ionicons name="checkmark" size={18} color="#ffffff" />
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
      
      <View style={styles.selectionIndicator} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  iconContainer: {
    width: 42,
    height: 42,
    backgroundColor: '#32322f',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  colorList: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  colorOption: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedColorOption: {
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  checkmark: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 10,
    padding: 1,
  },
  selectionIndicator: {
    height: 4,
    width: 36,
    backgroundColor: '#8e8e93',
    alignSelf: 'center',
    borderRadius: 2,
    marginBottom: 8,
    opacity: 0.3,
  },
}); 