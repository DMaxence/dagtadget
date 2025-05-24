import { Ionicons } from "@expo/vector-icons";
import { observer, useObservable } from "@legendapp/state/react";
import { router } from "expo-router";
import React, { useEffect } from "react";
import {
  ActionSheetIOS,
  Alert,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { ContextMenuButton } from "react-native-ios-context-menu";

import { ThemedText } from "@/components/ThemedText";
import { t } from "@/constants/i18n";
import { widgetActions, widgetState } from "@/state/widget";
import { Widget } from "@/types/widget";
import { COLOR_OPTIONS } from "./ColorSelector";
import {
  calculateGrowthPercentage,
  formatGrowthPercentage,
} from "@/utils/historyUtils";

interface WidgetItemProps {
  widget: Widget;
  onPress?: () => void;
}

export const WidgetItem = observer(({ widget, onPress }: WidgetItemProps) => {
  const refreshing = useObservable(false);
  const textColor = "#ffffff";
  const secondaryTextColor = "rgba(255, 255, 255, 0.8)";

  // Get a consistent color for this widget based on its ID
  const getWidgetColor = () => {
    // If widget has a color property, use it
    if (widget.color) {
      return widget.color;
    }

    // Otherwise fall back to the color algorithm
    const hashSum = widget.id
      .split("")
      .reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return COLOR_OPTIONS[hashSum % COLOR_OPTIONS.length];
  };

  // We only observe changes to this one widget
  const widgetObs = widgetState.widgets[widget.id];

  // Fetch data when component mounts if needed
  useEffect(() => {
    if (!widget.dataSource.lastValue) {
      fetchData();
    }
  }, []);

  const fetchData = async () => {
    console.log("FETCHING DATA for widget", widget.id);
    refreshing.set(true);
    try {
      await widgetActions.fetchWidgetData(widget.id);
      console.log("DATA FETCHED for widget", widget.id);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      refreshing.set(false);
    }
  };

  // Format the last fetched timestamp in a localized format (e.g., "16 mai 2025 à 00:38")
  const getLastUpdated = () => {
    if (!widget.dataSource.lastFetched) {
      return t("common.never");
    }

    const lastFetched = new Date(widget.dataSource.lastFetched);

    // Use Intl.DateTimeFormat for localized date formatting
    try {
      // Get device locale from the system
      const locale = Intl.DateTimeFormat().resolvedOptions().locale;
      return new Intl.DateTimeFormat(locale, {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(lastFetched);
    } catch (error) {
      // Fallback formatting if Intl API fails
      const month = String(lastFetched.getMonth() + 1).padStart(2, "0");
      const day = String(lastFetched.getDate()).padStart(2, "0");
      const year = lastFetched.getFullYear();
      const hours = String(lastFetched.getHours()).padStart(2, "0");
      const minutes = String(lastFetched.getMinutes()).padStart(2, "0");

      return `${day}/${month}/${year} ${hours}:${minutes}`;
    }
  };

  // Get icon for widget based on its name or data
  const getWidgetIcon = () => {
    // Simple algorithm to pick an icon based on widget name
    const name = widget.name.toLowerCase();

    if (name.includes("stock") || name.includes("price")) {
      return "trending-up-outline";
    } else if (name.includes("weather") || name.includes("temperature")) {
      return "cloud-outline";
    } else if (name.includes("time") || name.includes("date")) {
      return "calendar-outline";
    } else if (name.includes("bitcoin") || name.includes("crypto")) {
      return "logo-bitcoin";
    } else {
      return "stats-chart-outline";
    }
  };

  const handleOptionsPress = (event: any) => {
    event.stopPropagation();

    if (Platform.OS === "ios") {
      // Use ActionSheetIOS on iOS
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Cancel", "Refresh", "Edit", "Delete"],
          destructiveButtonIndex: 3,
          cancelButtonIndex: 0,
          userInterfaceStyle: "light",
        },
        (buttonIndex: number) => {
          if (buttonIndex === 1) {
            // Refresh
            fetchData();
          } else if (buttonIndex === 2) {
            // Edit
            router.push({
              pathname: "/edit-widget/[id]",
              params: { id: widget.id },
            });
          } else if (buttonIndex === 3) {
            // Delete
            confirmDelete();
          }
        }
      );
    } else {
      // Use Alert on Android
      Alert.alert(
        "Widget Options",
        "Choose an action",
        [
          {
            text: "Refresh",
            onPress: () => fetchData(),
          },
          {
            text: "Edit",
            onPress: () =>
              router.push({
                pathname: "/edit-widget/[id]",
                params: { id: widget.id },
              }),
          },
          {
            text: "Delete",
            onPress: () => confirmDelete(),
            style: "destructive",
          },
          {
            text: "Cancel",
            style: "cancel",
          },
        ],
        { cancelable: true }
      );
    }
  };

  const confirmDelete = () => {
    Alert.alert(
      "Delete Widget",
      `Are you sure you want to delete "${widget.name}"?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            widgetActions.deleteWidget(widget.id);
          },
        },
      ],
      { cancelable: true }
    );
  };

  // Directly access current widget data from the observable state
  const currentWidget = widgetObs.get();
  const isRefreshing = refreshing.get();
  const widgetColor = getWidgetColor();

  // Calculate growth percentage for the last 24 hours
  const getGrowthPercentage = () => {
    if (!currentWidget?.dataSource.history) return null;
    return calculateGrowthPercentage(currentWidget.dataSource.history, 24);
  };

  const growthPercentage = getGrowthPercentage();

  // Format value based on locale
  const formatValue = (value: string | undefined) => {
    if (!value || value.trim() === "") return "--";

    // Try to convert the value to a number for formatting
    const numericValue = parseFloat(value.replace(/,/g, "."));

    if (!isNaN(numericValue)) {
      try {
        // Get the device locale
        const locale = Intl.NumberFormat().resolvedOptions().locale;
        return new Intl.NumberFormat(locale, {
          maximumFractionDigits: value.includes(".")
            ? value.split(".")[1]?.length || 2
            : 2,
        }).format(numericValue);
      } catch (e) {
        // Fallback to original value if formatting fails
        return value;
      }
    }

    // If it's not a number, return the original value
    return value;
  };

  if (!currentWidget) {
    return null;
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.container, { backgroundColor: widgetColor }]}
      activeOpacity={0.7}
    >
      {/* Left section - Title and updated date */}
      <View style={styles.leftSection}>
        <ThemedText style={[styles.name, { color: textColor }]} type="subtitle">
          {currentWidget.name}
        </ThemedText>
        {/* <View style={styles.metadataRow}> */}
        <ThemedText
          style={[styles.updatedAt, { color: secondaryTextColor }]}
          type="default"
        >
          {getLastUpdated()}
        </ThemedText>
        {growthPercentage !== null && (
          <View style={styles.metadataRow}>
            <View
              style={[
                styles.growthBadge,
                {
                  backgroundColor: "rgba(255, 255, 255, 0.9)",
                },
              ]}
            >
              <Ionicons
                name={growthPercentage >= 0 ? "trending-up" : "trending-down"}
                size={14}
                color={growthPercentage >= 0 ? "#34c759" : "#ff453a"}
              />
              <ThemedText
                style={[
                  styles.growthText,
                  {
                    color: growthPercentage >= 0 ? "#34c759" : "#ff453a",
                  },
                ]}
                type="default"
              >
                {formatGrowthPercentage(growthPercentage)}
              </ThemedText>
            </View>
          </View>
        )}
        {/* </View> */}
      </View>

      {/* Middle section - Value */}
      <View style={styles.middleSection}>
        <ThemedText
          style={[styles.value, { color: textColor }]}
          numberOfLines={1}
          adjustsFontSizeToFit={true}
          minimumFontScale={0.7}
          type="subtitle"
        >
          {currentWidget.prefix || ""}
          {formatValue(currentWidget.dataSource.lastValue)}
          {currentWidget.suffix || ""}
        </ThemedText>
      </View>

      {/* Right section - Menu button */}
      <View style={styles.rightSection}>
        {Platform.OS === "android" ? (
          <TouchableOpacity
            style={styles.menuButton}
            onPress={handleOptionsPress}
          >
            <Ionicons name="ellipsis-vertical" size={20} color={textColor} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.menuButton}>
            <ContextMenuButton
              isMenuPrimaryAction={true}
              menuConfig={{
                menuTitle: currentWidget.name,
                menuItems: [
                  {
                    actionKey: "refresh",
                    actionTitle: "Refresh",
                    icon: {
                      type: "IMAGE_SYSTEM",
                      imageValue: {
                        systemName: "arrow.clockwise",
                      },
                    },
                  },
                  {
                    actionKey: "edit",
                    actionTitle: "Edit",
                    icon: {
                      type: "IMAGE_SYSTEM",
                      imageValue: {
                        systemName: "pencil",
                      },
                    },
                  },
                  {
                    actionKey: "delete",
                    actionTitle: "Delete",
                    menuAttributes: ["destructive"],
                    icon: {
                      type: "IMAGE_SYSTEM",
                      imageValue: {
                        systemName: "trash",
                      },
                    },
                  },
                ],
              }}
              onPress={(event: any) => {
                event.stopPropagation();
              }}
              onPressMenuItem={({ nativeEvent }: { nativeEvent: any }) => {
                // nativeEvent.stopPropagation();
                switch (nativeEvent.actionKey) {
                  case "refresh":
                    fetchData();
                    break;
                  case "edit":
                    router.push({
                      pathname: "/edit-widget/[id]",
                      params: { id: widget.id },
                    });
                    break;
                  case "delete":
                    confirmDelete();
                    break;
                }
              }}
            >
              <Ionicons name="ellipsis-vertical" size={20} color={textColor} />
            </ContextMenuButton>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 12,
    marginHorizontal: 2,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  leftSection: {
    flex: 4,
    flexDirection: "column",
    justifyContent: "center",
  },
  middleSection: {
    flex: 3,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  rightSection: {
    flex: 1,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  widgetContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconContainer: {
    marginBottom: 12,
  },
  name: {
    fontWeight: "bold",
    // fontSize: 22,
    textAlign: "left",
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.9,
  },
  menuButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  valueContainer: {
    flexDirection: "column",
    alignItems: "flex-end",
    justifyContent: "center",
  },
  value: {
    textAlign: "center",
  },
  updatedAt: {
    textAlign: "left",
  },
  metadataRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  growthBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  growthText: {
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 2,
  },
});
