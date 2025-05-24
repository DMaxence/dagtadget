import React, { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

import { useThemeColor } from "@/hooks/useThemeColor";
import { t } from "@/constants/i18n";
import { ThemedText } from "./ThemedText";

interface JsonPathSelectorProps {
  data: any;
  currentPath: string;
  onPathSelect: (path: string) => void;
  isLoading: boolean;
}

export function JsonPathSelector({
  data,
  currentPath,
  onPathSelect,
  isLoading,
}: JsonPathSelectorProps) {
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(
    new Set([""])
  );

  const borderColor = useThemeColor(
    { light: "#e0e0e0", dark: "#333333" },
    "background"
  );
  const backgroundColor = useThemeColor(
    { light: "#f8f8f8", dark: "#1a1a1a" },
    "background"
  );
  const selectedColor = useThemeColor(
    { light: "#e6f0ff", dark: "#1a3c6a" },
    "background"
  );
  const accentColor = useThemeColor(
    { light: "#0070f3", dark: "#3694ff" },
    "tint"
  );
  const textColor = useThemeColor(
    { light: "#303030", dark: "#e0e0e0" },
    "text"
  );
  const folderColor = useThemeColor(
    { light: "#666666", dark: "#999999" },
    "text"
  );
  const keyColor = useThemeColor({ light: "#444444", dark: "#bbbbbb" }, "text");
  const stringColor = useThemeColor(
    { light: "#008800", dark: "#4caf50" },
    "text"
  );
  const numberColor = useThemeColor(
    { light: "#0066cc", dark: "#29b6f6" },
    "text"
  );
  const booleanColor = useThemeColor(
    { light: "#9900cc", dark: "#ce93d8" },
    "text"
  );
  const nullColor = useThemeColor(
    { light: "#cc0000", dark: "#ef5350" },
    "text"
  );

  // Check if a value is a primitive type that can be selected
  const isSelectable = (value: any): boolean => {
    const type = typeof value;
    return (
      type === "string" ||
      type === "number" ||
      type === "boolean" ||
      value === null
    );
  };

  const getValueColor = (value: any) => {
    if (value === null || value === undefined) return nullColor;

    const type = typeof value;
    switch (type) {
      case "string":
        return stringColor;
      case "number":
        return numberColor;
      case "boolean":
        return booleanColor;
      default:
        return textColor;
    }
  };

  const getValueDisplay = (value: any) => {
    if (value === null) return t("dataSelection.null");
    if (value === undefined) return t("dataSelection.undefined");

    const type = typeof value;
    switch (type) {
      case "string":
        return `"${value}"`;
      case "object":
        return Array.isArray(value) ? t("dataSelection.array") : t("dataSelection.object");
      default:
        return String(value);
    }
  };

  const toggleExpanded = (path: string) => {
    const newExpandedPaths = new Set(expandedPaths);
    if (newExpandedPaths.has(path)) {
      newExpandedPaths.delete(path);
    } else {
      newExpandedPaths.add(path);
    }
    setExpandedPaths(newExpandedPaths);
  };

  const buildPath = (currentPath: string, key: string): string => {
    if (!currentPath) return key;
    return currentPath.includes("[") && currentPath.endsWith("]")
      ? `${currentPath.slice(0, -1)}.${key}]`
      : `${currentPath}.${key}`;
  };

  const renderJsonNode = (node: any, path: string = "", depth: number = 0) => {
    if (node === null || node === undefined) {
      return (
        <TouchableOpacity
          style={[
            styles.nodeRow,
            { paddingLeft: 8 + depth * 20 },
            path === currentPath && styles.selectedNode,
            path === currentPath && { backgroundColor: selectedColor },
          ]}
          onPress={() => onPathSelect(path)}
        >
          <ThemedText style={{ color: keyColor }}>{t("dataSelection.value")} </ThemedText>
          <ThemedText style={{ color: nullColor }}>{t("dataSelection.null")}</ThemedText>
        </TouchableOpacity>
      );
    }

    if (typeof node !== "object") {
      // This is a selectable primitive value
      return (
        <TouchableOpacity
          style={[
            styles.nodeRow,
            { paddingLeft: 8 + depth * 20 },
            path === currentPath && styles.selectedNode,
            path === currentPath && { backgroundColor: selectedColor },
          ]}
          onPress={() => onPathSelect(path)}
        >
          <ThemedText style={{ color: keyColor }}>{t("dataSelection.value")} </ThemedText>
          <ThemedText style={{ color: getValueColor(node) }}>
            {getValueDisplay(node)}
          </ThemedText>
        </TouchableOpacity>
      );
    }

    const isArray = Array.isArray(node);
    const isExpanded = expandedPaths.has(path);

    const toggleNode = () => {
      toggleExpanded(path);
    };

    return (
      <View key={path}>
        <TouchableOpacity
          style={[styles.nodeRow, { paddingLeft: 8 + depth * 20 }]}
          onPress={toggleNode}
        >
          <View style={styles.folderIconContainer}>
            <ThemedText style={{ color: folderColor }}>
              {isExpanded ? "▼" : "▶"}
            </ThemedText>
          </View>
          <ThemedText style={{ color: folderColor }}>
            {isArray ? t("dataSelection.array") : t("dataSelection.object")}{" "}
            {isArray
              ? `[${Object.keys(node).length}]`
              : `{${Object.keys(node).length}}`}
          </ThemedText>
        </TouchableOpacity>

        {isExpanded &&
          Object.keys(node).map((key) => {
            const childPath = isArray
              ? path
                ? `${path}[${key}]`
                : `[${key}]`
              : buildPath(path, key);

            const childNode = node[key];
            const isChildObject =
              childNode !== null && typeof childNode === "object";

            if (isChildObject) {
              // Render expandable object/array node
              return renderJsonNode(childNode, childPath, depth + 1);
            } else {
              // Render selectable primitive value
              return (
                <TouchableOpacity
                  key={childPath}
                  style={[
                    styles.nodeRow,
                    { paddingLeft: 8 + (depth + 1) * 20 },
                    childPath === currentPath && styles.selectedNode,
                    childPath === currentPath && {
                      backgroundColor: selectedColor,
                    },
                  ]}
                  onPress={() => onPathSelect(childPath)}
                >
                  <ThemedText style={{ color: keyColor }}>{key}: </ThemedText>
                  <ThemedText
                    style={{ color: getValueColor(childNode) }}
                    numberOfLines={1}
                    ellipsizeMode="middle"
                  >
                    {getValueDisplay(childNode)}
                  </ThemedText>
                </TouchableOpacity>
              );
            }
          })}
      </View>
    );
  };

  if (isLoading) {
    return (
      <View
        style={[styles.container, styles.loadingContainer, { borderColor }]}
      >
        <ActivityIndicator size="small" color={accentColor} />
        <ThemedText style={styles.loadingText}>
          {t("loading.dataWillBeFetched")}
        </ThemedText>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={[styles.container, { borderColor }]}>
        <ThemedText style={styles.emptyText}>
          {t("dataSelection.noData")}
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={[styles.container, { borderColor, backgroundColor }]}>
      <ScrollView style={styles.scrollView}>{renderJsonNode(data)}</ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    maxHeight: 300,
    marginVertical: 8,
  },
  loadingContainer: {
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 8,
    textAlign: "center",
    opacity: 0.7,
  },
  emptyText: {
    padding: 20,
    textAlign: "center",
    opacity: 0.7,
  },
  scrollView: {
    padding: 8,
  },
  nodeRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingRight: 12,
    borderRadius: 6,
  },
  folderIconContainer: {
    width: 16,
    marginRight: 4,
  },
  selectedNode: {
    borderRadius: 6,
  },
});
