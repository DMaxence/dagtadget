# Widget Historical Data Storage

This document explains how to use the widget historical data storage features to track value changes over time and create analytics dashboards.

## Overview

Every time a widget's data is refreshed, the system now automatically stores:
- Timestamp of the data fetch
- The fetched value
- Any error that occurred during fetching

This historical data is stored with each widget and can be used to:
- Display growth percentages
- Show trending indicators
- Generate charts and graphs
- Calculate analytics and statistics

## Data Structure

Each historical data point contains:

```typescript
interface HistoricalDataPoint {
  timestamp: number;    // Unix timestamp in milliseconds
  value: string;        // The fetched value as a string
  error?: string;       // Error message if fetch failed
}
```

Historical data is stored in the widget's `dataSource.history` array, with a maximum of 100 entries per widget to prevent unlimited storage growth.

## Accessing Historical Data

### Get Widget History
```typescript
import { widgetActions } from "@/state/widget";

// Get all historical data for a widget
const history = widgetActions.getWidgetHistory(widgetId);
```

### Get Value Change Information
```typescript
// Get 24-hour change information
const change = widgetActions.getValueChange(widgetId, 24);
if (change) {
  console.log(`Current: ${change.current}`);
  console.log(`Previous: ${change.previous}`);
  console.log(`Change: ${change.percentageChange}%`);
  console.log(`Direction: ${change.direction}`); // 'up', 'down', or 'stable'
}
```

### Export Historical Data
```typescript
// Export historical data as JSON
const exportData = widgetActions.exportWidgetHistory(widgetId);
// Returns an object with widget info and full history
```

### Get Chart-Ready Data
```typescript
// Get data formatted for charting (last 7 days)
const chartData = widgetActions.getChartData(widgetId, 168);
// Returns array of { timestamp, date, value, formattedValue }
```

## Using History Utilities

The `@/utils/historyUtils` module provides several utility functions:

### Calculate Growth Percentage
```typescript
import { calculateGrowthPercentage, formatGrowthPercentage } from "@/utils/historyUtils";

const history = widgetActions.getWidgetHistory(widgetId);

// Calculate 24-hour growth
const growth24h = calculateGrowthPercentage(history, 24);
const formattedGrowth = formatGrowthPercentage(growth24h); // "+5.2%" or "-2.1%"
```

### Get Trend Analysis
```typescript
import { getTrend } from "@/utils/historyUtils";

const trend = getTrend(history, 5); // Analyze last 5 data points
// Returns: "up", "down", "stable", or null
```

### Get Summary Statistics
```typescript
import { getHistorySummary } from "@/utils/historyUtils";

const summary = getHistorySummary(history, 168); // Last 7 days
console.log(summary);
// {
//   min: 100.5,
//   max: 150.2,
//   average: 125.8,
//   latest: 142.1,
//   dataPoints: 42
// }
```

### Get Chart Data
```typescript
import { getChartData } from "@/utils/historyUtils";

const chartData = getChartData(history, 24); // Last 24 hours
// Returns: Array<{ timestamp: number, value: number }>
```

## Example: Creating a Growth Indicator

```typescript
import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { calculateGrowthPercentage, formatGrowthPercentage } from "@/utils/historyUtils";

const GrowthIndicator = ({ widget }) => {
  const history = widget.dataSource.history || [];
  const growth24h = calculateGrowthPercentage(history, 24);
  
  if (growth24h === null) return null;
  
  const isPositive = growth24h >= 0;
  const color = isPositive ? "#34c759" : "#ff3b30";
  const icon = isPositive ? "trending-up" : "trending-down";
  
  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <Ionicons name={icon} size={16} color={color} />
      <Text style={{ color, marginLeft: 4 }}>
        {formatGrowthPercentage(growth24h)}
      </Text>
    </View>
  );
};
```

## Example: Creating a Simple Chart Component

```typescript
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { getChartData } from "@/utils/historyUtils";

const SimpleChart = ({ widget, hoursBack = 168 }) => {
  const history = widget.dataSource.history || [];
  const chartData = getChartData(history, hoursBack);
  
  if (chartData.length === 0) {
    return <Text>No data available</Text>;
  }
  
  const values = chartData.map(point => point.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = maxValue - minValue;
  
  return (
    <View style={styles.chartContainer}>
      <Text style={styles.title}>Last {hoursBack}h</Text>
      <View style={styles.chart}>
        {chartData.map((point, index) => {
          const height = range > 0 ? ((point.value - minValue) / range) * 100 : 50;
          return (
            <View
              key={point.timestamp}
              style={[
                styles.bar,
                { height: `${height}%` }
              ]}
            />
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  chartContainer: {
    padding: 16,
    backgroundColor: "#f8f8f8",
    borderRadius: 8,
  },
  title: {
    fontWeight: "bold",
    marginBottom: 8,
  },
  chart: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 100,
    gap: 2,
  },
  bar: {
    flex: 1,
    backgroundColor: "#007AFF",
    borderRadius: 2,
    minHeight: 2,
  },
});
```

## Data Management

### Automatic Cleanup
Historical data is automatically limited to 100 entries per widget. When new data is added, the oldest entries are removed.

### Manual Cleanup
You can manually clean up old data:

```typescript
// Remove data older than 30 days for all widgets
const result = widgetActions.cleanupOldHistory(30);
console.log(`Removed ${result.removedDataPoints} old data points`);
```

### Clear Widget History
```typescript
// Clear all historical data for a specific widget
widgetActions.clearWidgetHistory(widgetId);
```

## Analytics Component

A complete analytics component (`WidgetAnalytics`) is available that demonstrates how to create a comprehensive dashboard showing:
- Growth percentages for multiple time periods
- Trend analysis
- Summary statistics
- Recent value history

```typescript
import { WidgetAnalytics } from "@/components/WidgetAnalytics";

// Usage
<WidgetAnalytics widget={widget} />
```

## Performance Considerations

- Historical data is stored in SQLite via LegendState's persistence
- Data is automatically limited to 100 entries per widget
- Consider using the cleanup functions for maintenance
- For large amounts of historical data, consider implementing pagination
- Chart data functions filter by time range to avoid processing unnecessary data

## Future Enhancements

The historical data foundation enables many future features:
- Integration with charting libraries (Chart.js, Victory, etc.)
- Export to CSV/Excel
- More sophisticated analytics (moving averages, correlations, etc.)
- Alerts based on significant changes
- Data comparison between widgets
- Historical data synchronization across devices 