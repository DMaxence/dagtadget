import { ExtensionStorage } from "@bacons/apple-targets";
import config from "../app.json";
import { Widget } from "../types/widget";

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
 * Shares data with the widget
 * @param widgetId The id of the widget
 * @param data The data to share
 */
export function shareWidgetData(
  widgetId: string,
  data:
    | string
    | number
    | Record<string, string | number>
    | Array<Record<string, string | number>>
    | undefined
) {
  const storage = new ExtensionStorage(
    config.expo.ios.entitlements["com.apple.security.application-groups"][0]
  );
  storage.set(widgetId, data);

  // Finally, you can reload the widget:
  ExtensionStorage.reloadWidget(widgetId);
}

/**
 * Synchronizes a widget with the widget extension
 * @param widget The widget configuration
 * @param value The current value to show (optional)
 */
export function syncWidgetWithExtension(widget: Widget, value?: string) {
  // Convert our widget format to the one expected by the widget extension
  const widgetData: Record<string, string | number> = {
    id: widget.id,
    name: widget.name,
    lastFetched: Date.now(),
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

  // Share with widget extension
  shareWidgetData(widget.id, widgetData);
}

/**
 * Synchronizes all widgets with the widget extension
 * @param widgets List of widgets to sync
 */
export function syncAllWidgetsWithExtension(widgets: Widget[]) {
  widgets.forEach((widget) => {
    syncWidgetWithExtension(widget);
  });

  // Reload all widgets
  // ExtensionStorage.reloadWidget();
}
