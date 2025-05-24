import { HistoricalDataPoint } from "@/types/widget";

/**
 * Calculate the percentage change between the latest value and a previous value
 * @param history Array of historical data points
 * @param hoursBack Number of hours to look back for comparison (default: 24)
 * @returns Percentage change or null if not enough data
 */
export function calculateGrowthPercentage(
  history: HistoricalDataPoint[],
  hoursBack: number = 24
): number | null {
  if (!history || history.length < 2) return null;

  const now = Date.now();
  const lookbackTime = now - (hoursBack * 60 * 60 * 1000);
  
  // Get the latest value
  const latestPoint = history[history.length - 1];
  if (!latestPoint || latestPoint.error) return null;

  // Find the closest point to the lookback time
  const previousPoint = history
    .filter(point => point.timestamp <= lookbackTime && !point.error)
    .pop();

  if (!previousPoint) return null;

  const latestValue = parseFloat(latestPoint.value);
  const previousValue = parseFloat(previousPoint.value);

  if (isNaN(latestValue) || isNaN(previousValue) || previousValue === 0) {
    return null;
  }

  return ((latestValue - previousValue) / previousValue) * 100;
}

/**
 * Get the trend direction for a widget
 * @param history Array of historical data points
 * @param pointsToCheck Number of recent points to analyze (default: 5)
 * @returns "up", "down", or "stable"
 */
export function getTrend(
  history: HistoricalDataPoint[],
  pointsToCheck: number = 5
): "up" | "down" | "stable" | null {
  if (!history || history.length < 2) return null;

  // Get the last few points without errors
  const validPoints = history
    .filter(point => !point.error)
    .slice(-pointsToCheck);

  if (validPoints.length < 2) return null;

  const values = validPoints.map(point => parseFloat(point.value)).filter(v => !isNaN(v));
  if (values.length < 2) return null;

  // Calculate simple linear trend
  let increases = 0;
  let decreases = 0;

  for (let i = 1; i < values.length; i++) {
    if (values[i] > values[i - 1]) increases++;
    else if (values[i] < values[i - 1]) decreases++;
  }

  if (increases > decreases) return "up";
  if (decreases > increases) return "down";
  return "stable";
}

/**
 * Get data points for charting, filtered by time range
 * @param history Array of historical data points
 * @param hoursBack Number of hours to include (default: 168 = 1 week)
 * @returns Filtered array of data points suitable for charting
 */
export function getChartData(
  history: HistoricalDataPoint[],
  hoursBack: number = 168
): Array<{ timestamp: number; value: number }> {
  if (!history) return [];

  const now = Date.now();
  const cutoffTime = now - (hoursBack * 60 * 60 * 1000);

  return history
    .filter(point => point.timestamp >= cutoffTime && !point.error)
    .map(point => ({
      timestamp: point.timestamp,
      value: parseFloat(point.value)
    }))
    .filter(point => !isNaN(point.value));
}

/**
 * Get summary statistics for a widget's historical data
 * @param history Array of historical data points
 * @param hoursBack Number of hours to analyze (default: 168 = 1 week)
 * @returns Object with min, max, average, and latest values
 */
export function getHistorySummary(
  history: HistoricalDataPoint[],
  hoursBack: number = 168
) {
  const chartData = getChartData(history, hoursBack);
  
  if (chartData.length === 0) {
    return {
      min: null,
      max: null,
      average: null,
      latest: null,
      dataPoints: 0,
    };
  }

  const values = chartData.map(point => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const average = values.reduce((sum, val) => sum + val, 0) / values.length;
  const latest = values[values.length - 1];

  return {
    min,
    max,
    average,
    latest,
    dataPoints: values.length,
  };
}

/**
 * Format a growth percentage for display
 * @param percentage The percentage change
 * @returns Formatted string with + or - prefix and % suffix
 */
export function formatGrowthPercentage(percentage: number | null): string {
  if (percentage === null) return "—";
  
  const sign = percentage >= 0 ? "+" : "";
  return `${sign}${percentage.toFixed(1)}%`;
}

/**
 * Get the time range label for a given number of hours
 * @param hours Number of hours
 * @returns Human-readable time range label
 */
export function getTimeRangeLabel(hours: number): string {
  if (hours < 24) return `${hours}h`;
  if (hours < 168) return `${Math.round(hours / 24)}d`;
  if (hours < 720) return `${Math.round(hours / 168)}w`;
  return `${Math.round(hours / 720)}mo`;
} 