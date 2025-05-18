import { getAllWidgets, widgetActions } from "@/state/widget"; // Assuming getAllWidgets exists or can be added
import {
  Widget,
  WidgetRefreshInterval,
  refreshIntervalMs,
} from "@/types/widget";
import * as BackgroundTask from "expo-background-task";
import * as TaskManager from "expo-task-manager";
// import { reloadAllWidgets } from '@/utils/widgetUtils'; // We might need a utility to tell WidgetKit to refresh

const BACKGROUND_FETCH_TASK = "BACKGROUND_FETCH_TASK";

TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  try {
    console.log("[BackgroundTask] Starting task");
    // No need to explicitly call loadWidgetsFromStorage if using syncObservable with SQLite persistence,
    // as the state should be hydrated automatically.
    // However, if there are async operations needed to ensure data is ready, keep it.
    // For now, assuming legend-state handles this with SQLite persistence.
    // await loadWidgetsFromStorage();

    const widgets: Record<string, Widget> = getAllWidgets();

    const now = Date.now();
    let updatedWidget = false;

    for (const widgetId in widgets) {
      const widget = widgets[widgetId];
      if (!widget || !widget.dataSource) continue; // Basic check

      const intervalMs =
        refreshIntervalMs[widget.refreshInterval as WidgetRefreshInterval];
      const lastFetched = widget.dataSource.lastFetched || 0;

      if (now - lastFetched >= intervalMs) {
        console.log(
          `[BackgroundTask] Refreshing widget: ${widget.name} (ID: ${widget.id})`
        );
        try {
          await widgetActions.fetchWidgetData(widget.id);
          updatedWidget = true;
        } catch (error) {
          console.error(
            `[BackgroundTask] Error refreshing widget ${widget.id}:`,
            error
          );
        }
      }
    }

    if (updatedWidget) {
      // If any widget was updated, tell WidgetKit to reload all timelines.
      // The syncWidgetWithExtension in fetchWidgetData should handle updating UserDefaults.
      // WidgetKit's timeline provider in Swift should then pick up these changes.
      console.log(
        "[BackgroundTask] Widgets updated. WidgetKit should reload based on UserDefaults changes."
      );
    }

    console.log("[BackgroundTask] Task finished successfully");
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch (error) {
    console.error("[BackgroundTask] Task failed:", error);
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

export async function registerBackgroundTask() {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(
      BACKGROUND_FETCH_TASK
    );
    if (isRegistered) {
      console.log("[BackgroundTask] Task already registered.");
      // Optionally unregister and re-register if options need to change
      // await BackgroundTask.unregisterTaskAsync(BACKGROUND_FETCH_TASK);
      // console.log('[BackgroundTask] Unregistered existing task to re-register.');
    }

    await BackgroundTask.registerTaskAsync(BACKGROUND_FETCH_TASK, {
      minimumInterval: 15, // minutes
    });
    console.log("[BackgroundTask] Task registered");
  } catch (error) {
    console.error("[BackgroundTask] Failed to register task:", error);
  }
}

export async function unregisterBackgroundTask() {
  try {
    await BackgroundTask.unregisterTaskAsync(BACKGROUND_FETCH_TASK);
    console.log("[BackgroundTask] Task unregistered");
  } catch (error) {
    console.error("[BackgroundTask] Failed to unregister task:", error);
  }
}

export async function checkStatusAsync() {
  const status = await BackgroundTask.getStatusAsync();
  const isRegistered = await TaskManager.isTaskRegisteredAsync(
    BACKGROUND_FETCH_TASK
  );
  console.log(
    `[BackgroundTask] Status: ${
      status !== null ? BackgroundTask.BackgroundTaskStatus[status] : "N/A"
    }`
  );
  console.log(`[BackgroundTask] Is Registered: ${isRegistered}`);
}

// To trigger for testing (call this from somewhere in your app in DEV mode):
export async function triggerBackgroundTaskForTesting() {
  if (__DEV__) {
    console.log("[BackgroundTask] Triggering task for testing...");
    await BackgroundTask.triggerTaskWorkerForTestingAsync(); // No task name needed here
  } else {
    console.log(
      "[BackgroundTask] triggerTaskWorkerForTestingAsync is only available in DEV mode."
    );
  }
}
