import { computed, observable } from "@legendapp/state";
import { observablePersistSqlite } from "@legendapp/state/persist-plugins/expo-sqlite";
import { configureSynced, syncObservable } from "@legendapp/state/sync";
import { randomUUID } from "expo-crypto";
import Storage from "expo-sqlite/kv-store";

import {
  refreshIntervalMs,
  Widget,
  WidgetRefreshInterval,
} from "@/types/widget";
import { parseJsonPath } from "@/utils/jsonPath";
import {
  syncWidgetWithExtension,
  removeWidgetDataFromExtension,
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
      widgetObservable.updatedAt.set(Date.now());
      let settingsChanged = false;
      Object.entries(updates).forEach(([key, value]) => {
        // @ts-ignore - Dynamic property assignment
        widgetObservable[key].set(value);
        if (key === 'refreshInterval' || key === 'name' || key === 'prefix' || key === 'suffix' || key === 'color' || key === 'dataSource') {
          settingsChanged = true;
        }
      });

      const currentWidget = widgetObservable.peek();
      if (currentWidget) {
        // If settings that affect display or refresh schedule changed, sync with extension
        if (settingsChanged) {
          syncWidgetWithExtension(currentWidget, currentWidget.dataSource.lastValue);
        }

        // If data source URL or headers changed, we should probably re-fetch data immediately.
        // For this example, we assume fetchWidgetData will be called separately if needed after URL/header changes.
        // If just the interval or other display properties changed, re-fetching might not be desired immediately,
        // but syncing with the extension (above) and rescheduling foreground refreshes (below) is important.
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


      // Update widget with fetched data
      widgetState.widgets[id].dataSource.lastFetched.set(Date.now());
      widgetState.widgets[id].dataSource.lastValue.set(String(value));
      widgetState.widgets[id].dataSource.lastError.set(undefined);

      // Share the widget data with the widget extension
      syncWidgetWithExtension(widget, String(value));

      return value;
    } catch (error) {
      widgetState.widgets[id].dataSource.lastError.set(String(error));
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
};

// Function to get all widgets (for background task)
export const getAllWidgets = (): Record<string, Widget> => {
  return widgetState.widgets.peek();
};
