/**
 * Parse a JSON path expression and extract the value from a data object.
 * Supports nested object properties and array indexing.
 *
 * Examples:
 * - "data.value"
 * - "data[0].value"
 * - "results.measurements[2].temperature"
 * - "response.data.items[0].details[1].value"
 *
 * @param data The JSON object to extract value from
 * @param path The path expression (e.g., "data.value", "data[0].value")
 * @returns The extracted value or null if path is invalid
 */
export function parseJsonPath(data: any, path?: string): any {
  // If no path provided or data is null/undefined, return the data as is
  if (!path || path === "" || data === null || data === undefined) {
    return data;
  }

  try {
    // Initial state
    let currentValue = data;

    // Match both regular properties and array indices
    // This regex matches:
    // 1. Simple property names: "property"
    // 2. Array indices: "array[0]"
    // 3. Nested combinations: "items[0].details[1].value"
    const pathSegmentRegex = /([^\.\[\]]+)|\[(\d+)\]/g;

    let match;
    while ((match = pathSegmentRegex.exec(path)) !== null) {
      // If current value is null or undefined, we can't go deeper
      if (currentValue === null || currentValue === undefined) {
        return null;
      }

      if (match[1]) {
        // Property access: object.property
        const property = match[1];
        currentValue = currentValue[property];
      } else if (match[2]) {
        // Array index: array[index]
        const index = parseInt(match[2], 10);
        if (
          Array.isArray(currentValue) &&
          index >= 0 &&
          index < currentValue.length
        ) {
          currentValue = currentValue[index];
        } else {
          return null; // Invalid array access
        }
      }
    }

    return currentValue;
  } catch (error) {
    console.error("Error parsing JSON path:", error);
    return null;
  }
}
