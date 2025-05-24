import { computed, observable } from "@legendapp/state";
import { observablePersistSqlite } from "@legendapp/state/persist-plugins/expo-sqlite";
import { configureSynced, syncObservable } from "@legendapp/state/sync";
import { randomUUID } from "expo-crypto";
import Storage from "expo-sqlite/kv-store";

import { refreshIntervalMs, Widget, WidgetDataSource } from "@/types/widget";
import { parseJsonPath } from "@/utils/jsonPath";
import {
  removeWidgetDataFromExtension,
  syncWidgetWithExtension,
} from "@/utils/widgetUtils";

// Initial state
interface WidgetState {
  widgets: Record<string, Widget>;
  loading: boolean;
  error: string | null;
}

const initialState: WidgetState = {
  widgets: {},
  loading: false,
  error: null,
};

// Configure SQLite persistence
const persistOptions = configureSynced({
  persist: {
    plugin: observablePersistSqlite(Storage),
  },
});

// Create the observable state
export const widgetState = observable<WidgetState>(initialState);

// Store for tracking refresh intervals
interface GlobalWithWidgetIntervals {
  _widgetRefreshIntervals?: NodeJS.Timeout[];
}

const globalWithWidgetIntervals = global as GlobalWithWidgetIntervals;

// Configure persistence for widgets
syncObservable(
  widgetState,
  persistOptions({
    persist: {
      name: "widgets",
    },
  })
);

// Computed values
export const widgetList = computed(() => {
  const widgets = widgetState.widgets.get();
  return Object.values(widgets).sort((a, b) => a.createdAt - b.createdAt);
});

// Actions
export const widgetActions = {
  // Create a new widget
  createWidget: (widget: Omit<Widget, "id" | "createdAt" | "updatedAt">) => {
    const now = Date.now();
    const id = randomUUID();
    widgetState.widgets[id].set({
      ...widget,
      id,
      createdAt: now,
      updatedAt: now,
    });

    return id;
  },

  // Update an existing widget
  updateWidget: (
    id: string,
    updates: Partial<Omit<Widget, "id" | "createdAt" | "updatedAt">>
  ) => {
    const widgetObservable = widgetState.widgets[id];
    if (widgetObservable.peek()) {
      const currentWidget = widgetObservable.peek();
      if (!currentWidget) return false;

      widgetObservable.updatedAt.set(Date.now());
      let settingsChanged = false;
      let dataSourceChanged = false;

      Object.entries(updates).forEach(([key, value]) => {
        if (key === "dataSource" && value) {
          // Handle dataSource updates carefully to preserve history
          const currentDataSource = currentWidget.dataSource;
          const newDataSource = value as WidgetDataSource;

          // Check if URL or jsonPath changed (these are the critical changes that invalidate history)
          const urlChanged = newDataSource.url !== currentDataSource.url;
          const jsonPathChanged =
            newDataSource.jsonPath !== currentDataSource.jsonPath;

          if (urlChanged || jsonPathChanged) {
            // If URL or jsonPath changed, clear history since it's a different data source
            widgetObservable.dataSource.set({
              ...newDataSource,
              history: [], // Clear history for new data source
            });
            dataSourceChanged = true;
          } else {
            // If only other properties changed (headers, etc.), preserve history
            widgetObservable.dataSource.set({
              ...newDataSource,
              history: currentDataSource.history, // Preserve existing history
            });
          }
          settingsChanged = true;
        } else {
          // @ts-ignore - Dynamic property assignment
          widgetObservable[key].set(value);
          if (
            key === "refreshInterval" ||
            key === "name" ||
            key === "prefix" ||
            key === "suffix" ||
            key === "color"
          ) {
            settingsChanged = true;
          }
        }
      });

      const updatedWidget = widgetObservable.peek();
      if (updatedWidget) {
        // If settings that affect display or refresh schedule changed, sync with extension
        if (settingsChanged) {
          syncWidgetWithExtension(
            updatedWidget,
            updatedWidget.dataSource.lastValue
          );
        }

        // If the data source fundamentally changed (URL or jsonPath), fetch new data immediately
        if (dataSourceChanged) {
          // Optionally trigger immediate refresh for new data source
          // This is commented out as the caller may want to control when to fetch
          // widgetActions.fetchWidgetData(id);
        }
      }

      // If refreshInterval changed, the foreground schedules need updating.
      // More broadly, if any part of the widget that scheduleRefreshes depends on changes, it should be called.
      // For simplicity, calling it if settingsChanged is true (which includes refreshInterval).
      if (settingsChanged) {
        widgetActions.scheduleRefreshes();
      }

      return true;
    }
    return false;
  },

  // Delete a widget
  deleteWidget: (id: string) => {
    if (widgetState.widgets[id].peek()) {
      widgetState.widgets[id].delete();
      removeWidgetDataFromExtension(id);

      return true;
    }
    return false;
  },

  // Fetch data for a widget
  fetchWidgetData: async (id: string) => {
    const widget = widgetState.widgets[id].peek();
    if (!widget) return;

    try {
      widgetState.loading.set(true);

      // Convert headers array to fetch headers object if headers exist
      let fetchOptions: RequestInit = { method: "GET" };

      if (widget.dataSource.headers && widget.dataSource.headers.length > 0) {
        const headerObj = widget.dataSource.headers.reduce(
          (acc, { key, value }) => {
            if (key.trim() !== "") {
              acc[key] = value;
            }
            return acc;
          },
          {} as Record<string, string>
        );

        fetchOptions.headers = headerObj;
      }

      const response = await fetch(widget.dataSource.url, fetchOptions);
      if (!response.ok) {
        throw new Error(`Error fetching data: ${response.statusText}`);
      }

      const data = await response.json();

      // Extract the value using the jsonPath if specified
      let value = widget.dataSource.jsonPath
        ? parseJsonPath(data, widget.dataSource.jsonPath)
        : data;

      const timestamp = Date.now();
      const stringValue = String(value);

      // Update widget with fetched data
      widgetState.widgets[id].dataSource.lastFetched.set(timestamp);
      widgetState.widgets[id].dataSource.lastValue.set(stringValue);
      widgetState.widgets[id].dataSource.lastError.set(undefined);

      // Add to historical data
      const currentHistory = widget.dataSource.history || [];
      const newDataPoint = {
        timestamp,
        value: stringValue,
      };

      // Add new data point and limit history to last 100 entries
      // This prevents unlimited storage growth while keeping enough data for charts
      const updatedHistory = [...currentHistory, newDataPoint].slice(-100);
      widgetState.widgets[id].dataSource.history.set(updatedHistory);

      // Share the widget data with the widget extension
      syncWidgetWithExtension(widget, stringValue);

      return value;
    } catch (error) {
      const timestamp = Date.now();
      const errorMessage = String(error);

      // Store error in current state
      widgetState.widgets[id].dataSource.lastError.set(errorMessage);

      // Also add error to historical data for tracking
      const currentHistory = widget.dataSource.history || [];
      const newDataPoint = {
        timestamp,
        value: widget.dataSource.lastValue || "",
        error: errorMessage,
      };

      // Add new data point and limit history to last 100 entries
      const updatedHistory = [...currentHistory, newDataPoint].slice(-100);
      widgetState.widgets[id].dataSource.history.set(updatedHistory);

      return null;
    } finally {
      widgetState.loading.set(false);
    }
  },

  // Schedule refreshes for all widgets
  scheduleRefreshes: () => {
    const widgets = widgetState.widgets.peek();

    // Clear any existing intervals
    if (globalWithWidgetIntervals._widgetRefreshIntervals) {
      [...globalWithWidgetIntervals._widgetRefreshIntervals].forEach(
        clearInterval
      );
    }

    globalWithWidgetIntervals._widgetRefreshIntervals = [];

    // Set up new intervals for each widget
    Object.entries(widgets).forEach(([id, widget]) => {
      const interval = setInterval(() => {
        widgetActions.fetchWidgetData(id);
      }, refreshIntervalMs[widget.refreshInterval]);

      if (globalWithWidgetIntervals._widgetRefreshIntervals) {
        globalWithWidgetIntervals._widgetRefreshIntervals.push(interval);
      } else {
        globalWithWidgetIntervals._widgetRefreshIntervals = [interval];
      }
    });
  },

  refreshAllWidgets: async () => {
    const widgets = widgetState.widgets.peek();
    for (const widget of Object.values(widgets)) {
      await widgetActions.fetchWidgetData(widget.id);
    }
  },

  // Get historical data for a widget
  getWidgetHistory: (id: string) => {
    const widget = widgetState.widgets[id].peek();
    return widget?.dataSource.history || [];
  },

  // Clear historical data for a widget (useful for testing or maintenance)
  clearWidgetHistory: (id: string) => {
    const widget = widgetState.widgets[id].peek();
    if (widget) {
      widgetState.widgets[id].dataSource.history.set([]);
      return true;
    }
    return false;
  },

  // Get the latest value change information for a widget
  getValueChange: (id: string, hoursBack: number = 24) => {
    const widget = widgetState.widgets[id].peek();
    if (!widget?.dataSource.history) return null;

    const history = widget.dataSource.history;
    if (history.length < 2) return null;

    const now = Date.now();
    const lookbackTime = now - hoursBack * 60 * 60 * 1000;

    // Get the latest value
    const latestPoint = history[history.length - 1];
    if (!latestPoint || latestPoint.error) return null;

    // Find the closest point to the lookback time
    const previousPoint = history
      .filter((point) => point.timestamp <= lookbackTime && !point.error)
      .pop();

    if (!previousPoint) return null;

    const latestValue = parseFloat(latestPoint.value);
    const previousValue = parseFloat(previousPoint.value);

    if (isNaN(latestValue) || isNaN(previousValue)) return null;

    const absoluteChange = latestValue - previousValue;
    const percentageChange =
      previousValue !== 0 ? (absoluteChange / previousValue) * 100 : null;

    return {
      current: latestValue,
      previous: previousValue,
      absoluteChange,
      percentageChange,
      direction:
        absoluteChange > 0 ? "up" : absoluteChange < 0 ? "down" : "stable",
      hoursBack,
    };
  },

  // Export widget historical data as JSON
  exportWidgetHistory: (id: string) => {
    const widget = widgetState.widgets[id].peek();
    if (!widget?.dataSource.history) return null;

    return {
      widgetId: id,
      widgetName: widget.name,
      exportedAt: new Date().toISOString(),
      dataPoints: widget.dataSource.history.length,
      history: widget.dataSource.history.map((point) => ({
        timestamp: point.timestamp,
        date: new Date(point.timestamp).toISOString(),
        value: point.value,
        error: point.error || null,
      })),
    };
  },

  // Get chart-ready data for a widget
  getChartData: (id: string, hoursBack: number = 168) => {
    const widget = widgetState.widgets[id].peek();
    if (!widget?.dataSource.history) return [];

    const now = Date.now();
    const cutoffTime = now - hoursBack * 60 * 60 * 1000;

    return widget.dataSource.history
      .filter((point) => point.timestamp >= cutoffTime && !point.error)
      .map((point) => ({
        timestamp: point.timestamp,
        date: new Date(point.timestamp).toISOString(),
        value: parseFloat(point.value),
        formattedValue: `${widget.prefix || ""}${point.value}${
          widget.suffix || ""
        }`,
      }))
      .filter((point) => !isNaN(point.value));
  },

  // Clean up old historical data for all widgets (maintenance function)
  cleanupOldHistory: (maxDaysToKeep: number = 30) => {
    const widgets = widgetState.widgets.peek();
    const cutoffTime = Date.now() - maxDaysToKeep * 24 * 60 * 60 * 1000;

    let totalRemoved = 0;

    Object.keys(widgets).forEach((id) => {
      const widget = widgets[id];
      if (widget.dataSource.history) {
        const originalLength = widget.dataSource.history.length;
        const filteredHistory = widget.dataSource.history.filter(
          (point) => point.timestamp >= cutoffTime
        );

        if (filteredHistory.length !== originalLength) {
          widgetState.widgets[id].dataSource.history.set(filteredHistory);
          totalRemoved += originalLength - filteredHistory.length;
        }
      }
    });

    return {
      removedDataPoints: totalRemoved,
      cutoffDate: new Date(cutoffTime).toISOString(),
    };
  },
};

// Function to get all widgets (for background task)
export const getAllWidgets = (): Record<string, Widget> => {
  return widgetState.widgets.peek();
};
