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
