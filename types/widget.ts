// Widget refresh interval options
export enum WidgetRefreshInterval {
  MIN_15 = "15min",
  MIN_30 = "30min",
  HOUR_1 = "1h",
  HOUR_4 = "4h",
  HOUR_6 = "6h",
  HOUR_12 = "12h",
  DAY_1 = "24h",
  DAY_2 = "48h",
}

// Refresh interval in milliseconds
export const refreshIntervalMs: Record<WidgetRefreshInterval, number> = {
  [WidgetRefreshInterval.MIN_15]: 15 * 60 * 1000,
  [WidgetRefreshInterval.MIN_30]: 30 * 60 * 1000,
  [WidgetRefreshInterval.HOUR_1]: 60 * 60 * 1000,
  [WidgetRefreshInterval.HOUR_4]: 4 * 60 * 60 * 1000,
  [WidgetRefreshInterval.HOUR_6]: 6 * 60 * 60 * 1000,
  [WidgetRefreshInterval.HOUR_12]: 12 * 60 * 60 * 1000,
  [WidgetRefreshInterval.DAY_1]: 24 * 60 * 60 * 1000,
  [WidgetRefreshInterval.DAY_2]: 48 * 60 * 60 * 1000,
};

// Header key-value pair for API requests
export interface HeaderPair {
  id: string;
  key: string;
  value: string;
}

// Widget data fetching configuration
export interface WidgetDataSource {
  // API URL to fetch data from
  url: string;
  // Optional JSON path to extract specific data (e.g., "result.data.value")
  jsonPath?: string;
  // Optional HTTP headers for requests
  headers?: HeaderPair[];
  // Last fetch timestamp
  lastFetched?: number;
  // Last fetch result
  lastValue?: string;
  // Last fetch error if any
  lastError?: string;
}

// Widget configuration
export interface Widget {
  id: string;
  name: string;
  // Text to display before the data value
  prefix?: string;
  // Text to display after the data value
  suffix?: string;
  // Widget background color
  color: string;
  // Widget icon
  icon?: string;
  // Data source configuration
  dataSource: WidgetDataSource;
  // Refresh interval
  refreshInterval: WidgetRefreshInterval;
  // Creation timestamp
  createdAt: number;
  // Last update timestamp
  updatedAt: number;
}
