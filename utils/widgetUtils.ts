import { ExtensionStorage } from "@bacons/apple-targets";
import config from "../app.json";
import { Widget, refreshIntervalMs, WidgetRefreshInterval } from "../types/widget";
import { widgetActions } from "../state/widget";

/**
 * Formats a value with an optional prefix and suffix
 * @param value The value to format
 * @param prefix Optional prefix to add before the value
 * @param suffix Optional suffix to add after the value
 * @returns The formatted value
 */
export function formatValueWithPrefix(
  value: string | number,
  prefix?: string,
  suffix?: string
): string {
  let formattedValue = value.toString();

  if (prefix) {
    formattedValue = prefix + formattedValue;
  }

  if (suffix) {
    formattedValue = formattedValue + suffix;
  }

  return formattedValue;
}

/**
 * Get the shared storage instance
 * @returns The ExtensionStorage instance
 */
function getSharedStorage() {
  return new ExtensionStorage(
    config.expo.ios.entitlements["com.apple.security.application-groups"][0]
  );
}

/**
 * Shares data with the widget
 * @param widgetId The id of the widget
 * @param data The data to share
 */
export function shareWidgetData(
  widgetId: string,
  data:
    | string
    | number
    | Record<string, any>
    | Array<Record<string, string | number>>
    | undefined
) {
  const storage = getSharedStorage();
  storage.set(widgetId, data);

  // Finally, you can reload the widget:
  ExtensionStorage.reloadWidget();
}

/**
 * Synchronizes a widget with the widget extension
 * @param widget The widget configuration
 * @param value The current value to show (optional)
 */
export function syncWidgetWithExtension(widget: Widget, value?: string) {
  // Convert our widget format to the one expected by the widget extension
  const intervalMilliseconds = refreshIntervalMs[widget.refreshInterval as WidgetRefreshInterval];

  const widgetData: Record<string, any> = {
    id: widget.id,
    name: widget.name,
    lastFetched: Date.now(),
    // Ensure refreshIntervalMs is always a number. 
    // It's derived from WidgetRefreshInterval which should always be valid.
    refreshIntervalMs: intervalMilliseconds,
  };

  // Only add optional fields if they exist
  if (widget.prefix) widgetData.prefix = widget.prefix;
  if (widget.suffix) widgetData.suffix = widget.suffix;
  if (widget.color) widgetData.color = widget.color;
  if (value) widgetData.value = value;
  else if (widget.dataSource.lastValue)
    widgetData.value = widget.dataSource.lastValue;
  if (widget.dataSource.lastError)
    widgetData.lastError = widget.dataSource.lastError;

  // Add growth percentage and direction for trending widgets
  const valueChange = widgetActions.getValueChange(widget.id, 24);
  if (valueChange && valueChange.percentageChange !== null) {
    widgetData.growthPercentage = valueChange.percentageChange;
    widgetData.growthDirection = valueChange.direction;
  }

  // Add chart data for chart widgets (last 7 days, max 20 points)
  const chartData = widgetActions.getChartData(widget.id, 168); // 7 days
  if (chartData && chartData.length > 0) {
    // Limit to max 20 points for performance and reduce data to essential fields
    const limitedChartData = chartData
      .slice(-20)
      .map(point => ({
        timestamp: point.timestamp,
        value: point.value
      }));
    widgetData.chartData = limitedChartData;
  }

  // Share with widget extension
  shareWidgetData(widget.id, widgetData);
}

/**
 * Removes widget data from the widget extension's shared storage
 * @param widgetId The id of the widget to remove
 */
export function removeWidgetDataFromExtension(widgetId: string) {
  const storage = getSharedStorage();
  storage.remove(widgetId);

  // Reload all widget timelines and configurations.
  ExtensionStorage.reloadWidget(); 
}

/**
 * Synchronizes all widgets with the widget extension
 * @param widgets List of widgets to sync
 */
export function syncAllWidgetsWithExtension(widgets: Widget[]) {
  // Sync each individual widget's data
  widgets.forEach((widget) => {
    syncWidgetWithExtension(widget);
  });

  // Reload all widgets
  ExtensionStorage.reloadWidget();
}
