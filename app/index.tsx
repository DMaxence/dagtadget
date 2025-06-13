import { observer } from "@legendapp/state/react";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
} from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { WidgetItem } from "@/components/WidgetItem";
import { t } from "@/constants/i18n";
import { useThemeColor } from "@/hooks/useThemeColor";
import { widgetActions, widgetList } from "@/state/widget";
import { trackEvent } from "@aptabase/react-native";
import { usePostHog } from "posthog-react-native";

// Define a global interface to add the widget refresh intervals type
declare global {
  var _widgetRefreshIntervals: NodeJS.Timeout[] | undefined;
}

const HomeScreen = observer(() => {
  const widgets = widgetList.get();
  const posthog = usePostHog();
  const { searchText } = useLocalSearchParams<{ searchText: string }>();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const accentColor = useThemeColor(
    { light: "#0070f3", dark: "#3694ff" },
    "tint"
  );

  // Schedule widget refreshes whenever the widget list changes
  useEffect(() => {
    if (widgets.length > 0) {
      console.log("Scheduling refreshes for widgets:", widgets.length);
      widgetActions.scheduleRefreshes();
    }

    // Clean up intervals on unmount
    return () => {
      if (global._widgetRefreshIntervals) {
        global._widgetRefreshIntervals.forEach(clearInterval);
      }
    };
  }, [widgets.length]);

  const handleAddWidget = () => {
    if (!__DEV__) {
      posthog.capture("add_widget", { button: "empty_cta" });
      trackEvent("add_widget", { button: "empty_cta" });
    }
    router.push("/create-widget");
  };

  const onRefresh = React.useCallback(async () => {
    setIsRefreshing(true);
    try {
      // Assuming scheduleRefreshes might be async or returns a promise
      // If not, the await keyword won't hurt but also won't do anything.
      // If it has a callback or other mechanism for completion, that should be used.
      console.log("onRefresh");
      await widgetActions.refreshAllWidgets();
    } catch (error) {
      console.error("Failed to refresh widgets:", error);
      // Optionally, handle the error (e.g., show a toast message)
    } finally {
      setTimeout(() => {
        setIsRefreshing(false);
      }, 750);
    }
  }, []);

  const onNavigateToWidget = (widgetId: string) => {
    // @ts-ignore - This route will be created
    router.push({
      pathname: "/widget/[id]",
      params: { id: widgetId },
    });
  };

  const filteredWidgets = widgets.filter((widget) =>
    widget.name.toLowerCase().includes((searchText || "").toLowerCase())
  );

  const renderEmptyState = () => (
    <ThemedView style={styles.emptyContainer}>
      <ThemedText style={styles.emptyText}>{t("home.noWidgets")}</ThemedText>
      <TouchableOpacity
        style={[styles.addButton, { backgroundColor: accentColor }]}
        onPress={handleAddWidget}
      >
        <ThemedText style={styles.addButtonText}>
          {t("home.addWidget")}
        </ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );

  return (
    <FlatList
      data={filteredWidgets}
      keyExtractor={(item) => item.id}
      contentInsetAdjustmentBehavior="automatic"
      automaticallyAdjustKeyboardInsets={true}
      scrollsToTop={true}
      scrollToOverflowEnabled={true}
      renderItem={({ item }) => (
        <WidgetItem widget={item} onPress={() => onNavigateToWidget(item.id)} />
      )}
      numColumns={1}
      contentContainerStyle={styles.list}
      ListEmptyComponent={renderEmptyState}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
      }
      style={{
        paddingTop: 16,
      }}
    />
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 0,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 34,
    fontWeight: "bold",
    paddingTop: 16,
  },
  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
  },
  plusButton: {
    marginRight: 12,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#0070f3",
  },
  plusButtonText: {
    color: "#0070f3",
    fontWeight: "600",
  },
  settingsButton: {
    padding: 4,
  },
  searchBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 16,
    height: 36,
    borderRadius: 10,
    paddingHorizontal: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 36,
    fontSize: 16,
  },
  list: {
    paddingHorizontal: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  emptyText: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 24,
  },
  addButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addButtonText: {
    color: "white",
    fontWeight: "600",
  },
});

export default HomeScreen;
