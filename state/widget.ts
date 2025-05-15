import { computed, observable } from "@legendapp/state";
import { observablePersistSqlite } from "@legendapp/state/persist-plugins/expo-sqlite";
import { configureSynced, syncObservable } from "@legendapp/state/sync";
import { randomUUID } from "expo-crypto";
import Storage from "expo-sqlite/kv-store";

import { refreshIntervalMs, Widget } from "@/types/widget";
import { parseJsonPath } from "@/utils/jsonPath";
import { syncWidgetWithExtension } from "@/utils/widgetUtils";

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

// Setup persistence for the widget state
export const loadWidgetsFromStorage = async (): Promise<void> => {
  // This will be handled by the syncObservable call
  return Promise.resolve();
};

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
    if (widgetState.widgets[id].peek()) {
      widgetState.widgets[id].updatedAt.set(Date.now());
      Object.entries(updates).forEach(([key, value]) => {
        // @ts-ignore - Dynamic property assignment
        widgetState.widgets[id][key].set(value);
      });
      return true;
    }
    return false;
  },

  // Delete a widget
  deleteWidget: (id: string) => {
    if (widgetState.widgets[id].peek()) {
      widgetState.widgets[id].delete();
      return true;
    }
    return false;
  },

  // Fetch data for a widget
  fetchWidgetData: async (id: string) => {
    const widget = widgetState.widgets[id].peek();
    console.log(`widget ${id}:`, widget);
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
      console.log(`data ${id}:`, data);

      // Extract the value using the jsonPath if specified
      let value = widget.dataSource.jsonPath
        ? parseJsonPath(data, widget.dataSource.jsonPath)
        : data;

      console.log(`value ${id}:`, value);

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
