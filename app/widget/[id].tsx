import { Ionicons } from "@expo/vector-icons";
import { useObservable } from "@legendapp/state/react";
import { router, Stack, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  Dimensions,
} from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { WidgetAnalytics } from "@/components/WidgetAnalytics";
import { t } from "@/constants/i18n";
import { useThemeColor } from "@/hooks/useThemeColor";
import { widgetActions, widgetState } from "@/state/widget";
import { Widget } from "@/types/widget";
import {
  calculateGrowthPercentage,
  formatGrowthPercentage,
  getChartData,
} from "@/utils/historyUtils";
import {
  Svg,
  Path,
  Circle,
  Line as SvgLine,
  Text as SvgText,
} from "react-native-svg";

type TimelineOption = '1h' | '24h' | '7days' | '30days';

const timelineHoursMap: Record<TimelineOption, number> = {
  '1h': 1,
  '24h': 24,
  '7days': 168,
  '30days': 720,
};

export default function WidgetScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const widget = useObservable(widgetState.widgets[id ?? ""]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPullToRefresh, setIsPullToRefresh] = useState(false);
  const [selectedTimeline, setSelectedTimeline] = useState<TimelineOption>('7days');

  const backgroundColor = useThemeColor(
    { light: "#f8f9fa", dark: "#000000" },
    "background"
  );
  const cardColor = useThemeColor(
    { light: "#ffffff", dark: "#1c1c1e" },
    "background"
  );
  const textColor = useThemeColor(
    { light: "#000000", dark: "#ffffff" },
    "text"
  );
  const secondaryTextColor = useThemeColor(
    { light: "#6c757d", dark: "#8e8e93" },
    "text"
  );
  const accentColor = useThemeColor(
    { light: "#007AFF", dark: "#0A84FF" },
    "tint"
  );

  // Get translated timeline labels
  const getTimelineLabel = (timeline: TimelineOption): string => {
    switch (timeline) {
      case '1h':
        return t('widget.timeline.1h');
      case '24h':
        return t('widget.timeline.24h');
      case '7days':
        return t('widget.timeline.7days');
      case '30days':
        return t('widget.timeline.30days');
      default:
        return timeline;
    }
  };

  // Load widget data
  const widgetData = widget.peek() as Widget | null;

  const handleRefresh = useCallback(async () => {
    if (!id) return;
    setIsRefreshing(true);
    try {
      await widgetActions.fetchWidgetData(id);
    } catch (error) {
      console.error("Error refreshing widget:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, [id]);

  const handlePullToRefresh = useCallback(async () => {
    if (!id) return;
    setIsPullToRefresh(true);
    try {
      await widgetActions.fetchWidgetData(id);
    } catch (error) {
      console.error("Error refreshing widget:", error);
    } finally {
      setIsPullToRefresh(false);
    }
  }, [id]);

  const handleEdit = useCallback(() => {
    if (!id) return;
    router.push({
      pathname: "/edit-widget/[id]",
      params: { id },
    });
  }, [id]);

  // Navigate back if widget not found
  useEffect(() => {
    if (!widgetData && id) {
      router.replace("/");
    }
  }, [widgetData, id]);

  if (!widgetData || !id) {
    return (
      <ThemedView
        style={[
          styles.container,
          { backgroundColor, justifyContent: "center", alignItems: "center" },
        ]}
      >
        <ThemedText>{t("common.loading")}</ThemedText>
      </ThemedView>
    );
  }

  const formatValue = (value: string | undefined) => {
    if (!value || value.trim() === "") return "--";

    const numericValue = parseFloat(value.replace(/,/g, "."));
    if (!isNaN(numericValue)) {
      try {
        const locale = Intl.NumberFormat().resolvedOptions().locale;
        return new Intl.NumberFormat(locale, {
          maximumFractionDigits: value.includes(".")
            ? value.split(".")[1]?.length || 2
            : 2,
        }).format(numericValue);
      } catch (e) {
        return value;
      }
    }
    return value;
  };

  const getLastUpdated = () => {
    if (!widgetData.dataSource.lastFetched) {
      return t("common.never");
    }

    const lastFetched = new Date(widgetData.dataSource.lastFetched);
    try {
      const locale = Intl.DateTimeFormat().resolvedOptions().locale;
      return new Intl.DateTimeFormat(locale, {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(lastFetched);
    } catch (error) {
      const month = String(lastFetched.getMonth() + 1).padStart(2, "0");
      const day = String(lastFetched.getDate()).padStart(2, "0");
      const year = lastFetched.getFullYear();
      const hours = String(lastFetched.getHours()).padStart(2, "0");
      const minutes = String(lastFetched.getMinutes()).padStart(2, "0");
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    }
  };

  const SimpleChart = ({ history }: { history: any[] }) => {
    // Group and average data by day for day-based timelines
    const processDataForTimeline = (data: any[], timeline: TimelineOption) => {
      if (timeline !== '7days' && timeline !== '30days') {
        return getChartData(data, timelineHoursMap[timeline]);
      }

      // For day-based timelines, group by day and calculate averages
      const dayGroups = new Map<string, { values: number[], timestamps: number[] }>();
      
      data.forEach(point => {
        const date = new Date(point.timestamp);
        const dayKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
        
        if (!dayGroups.has(dayKey)) {
          dayGroups.set(dayKey, { values: [], timestamps: [] });
        }
        
        const numericValue = typeof point.value === 'string' 
          ? parseFloat(point.value.replace(/,/g, '.'))
          : point.value;
          
        if (!isNaN(numericValue)) {
          dayGroups.get(dayKey)!.values.push(numericValue);
          dayGroups.get(dayKey)!.timestamps.push(point.timestamp);
        }
      });

      // Convert groups to averaged data points
      const averagedData = Array.from(dayGroups.entries()).map(([dayKey, group]) => {
        const average = group.values.reduce((sum, val) => sum + val, 0) / group.values.length;
        // Use the latest timestamp for the day
        const latestTimestamp = Math.max(...group.timestamps);
        
        return {
          value: average,
          timestamp: latestTimestamp
        };
      });

      // Sort by timestamp and filter by timeline hours
      const sortedData = averagedData.sort((a, b) => a.timestamp - b.timestamp);
      const cutoffTime = Date.now() - (timelineHoursMap[timeline] * 60 * 60 * 1000);
      
      return sortedData.filter(point => point.timestamp >= cutoffTime);
    };

    const chartData = processDataForTimeline(history, selectedTimeline);
    const screenWidth = Dimensions.get("window").width - 32;
    const chartWidth = screenWidth - 32; // Account for card padding (16px on each side)
    const chartHeight = 200;
    const topPadding = 35; // Extra padding at top for value labels
    const bottomPadding = 40; // Increased for x-axis labels
    const sidePadding = 10; // Increased side padding to prevent overflow

    // Function to format x-axis labels based on timeline
    const getXAxisLabels = (data: any[], timeline: TimelineOption) => {
      if (data.length === 0) return [];
      
      const labels: { index: number; label: string; show: boolean }[] = [];
      
      // Get unique time periods from the data
      const getUniquePeriods = () => {
        const periods = new Map();
        
        data.forEach((point, index) => {
          const date = new Date(point.timestamp);
          let periodKey = '';
          
          switch (timeline) {
            case '1h':
              // Group by 10-minute intervals
              const minutes = Math.floor(date.getMinutes() / 10) * 10;
              periodKey = `${date.getHours()}:${minutes.toString().padStart(2, '0')}`;
              break;
            case '24h':
              // Group by hour
              periodKey = date.getHours().toString();
              break;
            case '7days':
              // Group by day
              periodKey = date.toDateString();
              break;
            case '30days':
              // Group by day
              periodKey = date.toDateString();
              break;
          }
          
          if (!periods.has(periodKey) || index === data.length - 1) {
            periods.set(periodKey, index);
          }
        });
        
        return Array.from(periods.values()).sort((a, b) => a - b);
      };
      
      const uniquePeriodIndices = getUniquePeriods();
      
      // Determine how many labels to show based on timeline and available data
      const getMaxLabels = () => {
        switch (timeline) {
          case '1h': return Math.min(6, uniquePeriodIndices.length);
          case '24h': return Math.min(6, uniquePeriodIndices.length);
          case '7days': return Math.min(7, uniquePeriodIndices.length);
          case '30days': return Math.min(8, uniquePeriodIndices.length);
          default: return 6;
        }
      };
      
      const maxLabels = getMaxLabels();
      const step = Math.max(1, Math.floor(uniquePeriodIndices.length / maxLabels));
      
      data.forEach((point, index) => {
        const date = new Date(point.timestamp);
        let label = '';
        let show = false;
        
        // Check if this index should show a label
        const isUniqueIndex = uniquePeriodIndices.includes(index);
        const uniquePosition = uniquePeriodIndices.indexOf(index);
        const shouldShow = isUniqueIndex && (
          uniquePosition % step === 0 || 
          index === 0 || 
          index === data.length - 1 ||
          uniquePosition === uniquePeriodIndices.length - 1
        );
        
        if (shouldShow) {
          switch (timeline) {
            case '1h':
              label = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              show = true;
              break;
            case '24h':
              label = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              show = true;
              break;
            case '7days':
              label = date.toLocaleDateString([], { weekday: 'short', day: 'numeric' });
              show = true;
              break;
            case '30days':
              label = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
              show = true;
              break;
          }
        }
        
        labels.push({ index, label, show });
      });
      
      return labels;
    };

    if (chartData.length === 0) {
      return (
        <View style={[styles.chartContainer, { backgroundColor: cardColor }]}>
          <ThemedText
            type="subtitle"
            style={[styles.chartTitle, { color: textColor }]}
          >
            {t("widget.chart.title")} ({getTimelineLabel(selectedTimeline)})
          </ThemedText>
          <TimelineSelector 
            selectedTimeline={selectedTimeline}
            onTimelineChange={setSelectedTimeline}
          />
          <View style={styles.noDataContainer}>
            <ThemedText
              style={[styles.noDataText, { color: secondaryTextColor }]}
            >
              {t("widget.chart.noData")}
            </ThemedText>
          </View>
        </View>
      );
    }

    // Handle single data point case
    if (chartData.length === 1) {
      const centerX = chartWidth / 2;
      const centerY = chartHeight / 2;
      const formattedValue = `${widgetData.prefix || ""}${formatValue(
        chartData[0].value.toString()
      )}${widgetData.suffix || ""}`;

      return (
        <View style={[styles.chartContainer, { backgroundColor: cardColor }]}>
          <ThemedText
            type="subtitle"
            style={[styles.chartTitle, { color: textColor }]}
          >
            {t("widget.chart.title")} ({getTimelineLabel(selectedTimeline)})
          </ThemedText>
          <TimelineSelector 
            selectedTimeline={selectedTimeline}
            onTimelineChange={setSelectedTimeline}
          />
          <View style={styles.chart}>
            <Svg height={chartHeight} width={chartWidth}>
              {/* Single data point */}
              <Circle
                cx={centerX}
                cy={centerY}
                r={6}
                fill={widgetData.color || accentColor}
              />
              {/* Value label */}
              <SvgText
                x={centerX}
                y={Math.max(centerY - 10, 15)}
                fontSize="12"
                fill={textColor}
                textAnchor="middle"
                fontWeight="600"
              >
                {formattedValue}
              </SvgText>
            </Svg>
          </View>
          <View style={styles.chartInfo}>
            <ThemedText
              style={[styles.chartInfoText, { color: secondaryTextColor }]}
            >
              {chartData.length} {t("widget.chart.dataPoints")}
            </ThemedText>
          </View>
        </View>
      );
    }

    const values = chartData.map((point) => point.value);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const range = maxValue - minValue;

    // Handle the case where all values are the same (range = 0)
    const chartRange = range > 0 ? range : 1;
    const baselineY = range > 0 ? 0 : 0.5; // Center line when all values are same

    // Get x-axis labels
    const xAxisLabels = getXAxisLabels(chartData, selectedTimeline);

    // Create SVG path for the line chart
    const points = chartData.map((point, index) => {
      const x =
        sidePadding +
        (index / (chartData.length - 1)) * (chartWidth - 2 * sidePadding);
      const normalizedValue =
        range > 0 ? (point.value - minValue) / chartRange : baselineY;
      const y =
        chartHeight - bottomPadding - normalizedValue * (chartHeight - topPadding - bottomPadding);

      // Ensure coordinates are valid numbers
      const validX = isNaN(x) ? sidePadding : x;
      const validY = isNaN(y) ? chartHeight / 2 : y;

      return {
        x: validX,
        y: validY,
        value: point.value,
        timestamp: point.timestamp,
      };
    });

    const pathData = points
      .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
      .join(" ");

    return (
      <View style={[styles.chartContainer, { backgroundColor: cardColor }]}>
        <ThemedText
          type="subtitle"
          style={[styles.chartTitle, { color: textColor }]}
        >
          {t("widget.chart.title")} ({getTimelineLabel(selectedTimeline)})
        </ThemedText>
        <TimelineSelector 
          selectedTimeline={selectedTimeline}
          onTimelineChange={setSelectedTimeline}
        />
        <View style={styles.chart}>
          <Svg height={chartHeight} width={chartWidth}>
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
              const y = topPadding + ratio * (chartHeight - topPadding - bottomPadding);
              return (
                <SvgLine
                  key={index}
                  x1={sidePadding}
                  y1={y}
                  x2={chartWidth - sidePadding}
                  y2={y}
                  stroke={secondaryTextColor}
                  strokeOpacity={0.2}
                  strokeWidth={1}
                />
              );
            })}

            {/* Chart line */}
            <Path
              d={pathData}
              stroke={widgetData.color || accentColor}
              strokeWidth={3}
              fill="none"
              strokeLinecap="round"
            />

            {/* Data points */}
            {points.map((point, index) => (
              <Circle
                key={index}
                cx={point.x}
                cy={point.y}
                r={4}
                fill={widgetData.color || accentColor}
              />
            ))}

            {/* X-axis labels */}
            {xAxisLabels.map((labelData, labelIndex) => {
              if (!labelData.show) return null;
              
              const point = points[labelData.index];
              if (!point) return null;

              // For day-based timelines, center labels more evenly
              let labelX = point.x;
              const visibleLabels = xAxisLabels.filter(l => l.show);
              const visibleLabelIndex = visibleLabels.findIndex(l => l.index === labelData.index);
              
              if (selectedTimeline === '7days' || selectedTimeline === '30days') {
                const totalVisibleLabels = visibleLabels.length;
                
                if (totalVisibleLabels > 1) {
                  // Distribute labels evenly across chart width
                  labelX = sidePadding + (visibleLabelIndex / (totalVisibleLabels - 1)) * (chartWidth - 2 * sidePadding);
                } else {
                  // Single label: center it
                  labelX = chartWidth / 2;
                }
              }

              return (
                <SvgText
                  key={`x-label-${labelIndex}`}
                  x={labelX + (visibleLabelIndex === 0 ? -10 : visibleLabelIndex === visibleLabels.length - 1 ? 10 : 0)}
                  y={chartHeight - 5}
                  fontSize="10"
                  fill={secondaryTextColor}
                  textAnchor={visibleLabelIndex === 0 ? "start" : visibleLabelIndex === visibleLabels.length - 1 ? "end" : "middle"}
                >
                  {labelData.label}
                </SvgText>
              );
            })}

            {/* Value labels */}
            {points.map((point, index) => {
              const formattedValue = `${widgetData.prefix || ""}${formatValue(
                point.value.toString()
              )}${widgetData.suffix || ""}`;
              
              // Only show label if it's the first point or value is different from previous
              const showLabel = index === 0 || point.value !== points[index - 1].value;
              
              if (!showLabel) return null;
              
              // Ensure text is always at least 15px from the top edge
              const textY = Math.max(point.y - 10, 15);

              return (
                <SvgText
                  key={`label-${index}`}
                  x={point.x + (index === 0 ? -10 : index === points.length - 1 ? 10 : 0)}
                  y={textY}
                  fontSize="12"
                  fill={textColor}
                  textAnchor={index === 0 ? "start" : index === points.length - 1 ? "end" : "middle"}
                  fontWeight="600"
                >
                  {formattedValue}
                </SvgText>
              );
            })}
          </Svg>
        </View>
        <View style={styles.chartInfo}>
          <ThemedText
            style={[styles.chartInfoText, { color: secondaryTextColor }]}
          >
            {chartData.length} {t("widget.chart.dataPoints")}
          </ThemedText>
        </View>
      </View>
    );
  };

  const TimelineSelector = ({ 
    selectedTimeline, 
    onTimelineChange 
  }: { 
    selectedTimeline: TimelineOption; 
    onTimelineChange: (timeline: TimelineOption) => void; 
  }) => {
    const options: TimelineOption[] = ['1h', '24h', '7days', '30days'];
    
    return (
      <View style={[
        styles.timelineSelector,
        { backgroundColor: useThemeColor({ light: "rgba(0, 0, 0, 0.05)", dark: "rgba(255, 255, 255, 0.1)" }, "background") }
      ]}>
        {options.map((option) => (
          <TouchableOpacity
            key={option}
            style={[
              styles.timelineOption,
              {
                backgroundColor: selectedTimeline === option ? accentColor : 'transparent',
              }
            ]}
            onPress={() => onTimelineChange(option)}
          >
            <ThemedText
              style={[
                styles.timelineOptionText,
                {
                  color: selectedTimeline === option ? 'white' : textColor,
                }
              ]}
            >
              {getTimelineLabel(option)}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const growth24h = calculateGrowthPercentage(
    widgetData.dataSource.history || [],
    24
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: widgetData.name,
          headerRight: () => (
            <TouchableOpacity onPress={handleEdit}>
              <ThemedText style={{ color: accentColor, fontWeight: "600" }}>
                {t("common.edit")}
              </ThemedText>
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView
        style={[styles.container, { backgroundColor }]}
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={
          <RefreshControl
            refreshing={isPullToRefresh}
            onRefresh={handlePullToRefresh}
          />
        }
      >
        {/* Main Widget Card */}
        <View style={[styles.mainCard, { backgroundColor: widgetData.color }]}>
          <View style={styles.cardHeader}>
            <ThemedText style={styles.cardTitle}>{widgetData.name}</ThemedText>
            <TouchableOpacity onPress={handleRefresh} disabled={isRefreshing}>
              <Ionicons
                name={isRefreshing ? "hourglass-outline" : "refresh-outline"}
                size={24}
                color="white"
                style={{
                  opacity: isRefreshing ? 0.5 : 1,
                }}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.valueSection}>
            <ThemedText type="title" style={{ color: "white" }}>
              {widgetData.prefix || ""}
              {formatValue(widgetData.dataSource.lastValue)}
              {widgetData.suffix || ""}
            </ThemedText>

            {growth24h !== null && (
              <View style={styles.growthContainer}>
                <Ionicons
                  name={growth24h >= 0 ? "trending-up" : "trending-down"}
                  size={16}
                  color="rgba(255, 255, 255, 0.9)"
                />
                <ThemedText style={styles.growthText}>
                  {formatGrowthPercentage(growth24h)} (24h)
                </ThemedText>
              </View>
            )}
          </View>

          <ThemedText style={styles.lastUpdated}>
            {t("widget.lastUpdated")}: {getLastUpdated()}
          </ThemedText>
        </View>

        {/* Chart Section */}
        <SimpleChart history={widgetData.dataSource.history || []} />

        {/* Analytics Section */}
        <WidgetAnalytics widget={widgetData} />

        {/* Widget Info Section */}
        <View style={[styles.infoCard, { backgroundColor: cardColor }]}>
          <ThemedText style={[styles.infoTitle, { color: textColor }]}>
            {t("widget.details.title")}
          </ThemedText>

          <View style={styles.infoRow}>
            <ThemedText
              style={[styles.infoLabel, { color: secondaryTextColor }]}
            >
              {t("widget.details.dataSource")}:
            </ThemedText>
            <ThemedText
              style={[styles.infoValue, { color: textColor }]}
              numberOfLines={2}
            >
              {widgetData.dataSource.url}
            </ThemedText>
          </View>

          {widgetData.dataSource.jsonPath && (
            <View style={styles.infoRow}>
              <ThemedText
                style={[styles.infoLabel, { color: secondaryTextColor }]}
              >
                {t("widget.details.jsonPath")}:
              </ThemedText>
              <ThemedText style={[styles.infoValue, { color: textColor }]}>
                {widgetData.dataSource.jsonPath}
              </ThemedText>
            </View>
          )}

          <View style={styles.infoRow}>
            <ThemedText
              style={[styles.infoLabel, { color: secondaryTextColor }]}
            >
              {t("widget.details.refreshInterval")}:
            </ThemedText>
            <ThemedText style={[styles.infoValue, { color: textColor }]}>
              {t(`refreshInterval.${widgetData.refreshInterval}`)}
            </ThemedText>
          </View>

          <View style={styles.infoRow}>
            <ThemedText
              style={[styles.infoLabel, { color: secondaryTextColor }]}
            >
              {t("widget.details.created")}:
            </ThemedText>
            <ThemedText style={[styles.infoValue, { color: textColor }]}>
              {new Date(widgetData.createdAt).toLocaleDateString()}
            </ThemedText>
          </View>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mainCard: {
    margin: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
    flex: 1,
  },
  valueSection: {
    marginBottom: 16,
  },
  growthContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  growthText: {
    color: "rgba(255, 255, 255, 0.9)",
    fontWeight: "600",
    marginLeft: 4,
  },
  lastUpdated: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 14,
  },
  chartContainer: {
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  chartTitle: {
    marginBottom: 16,
  },
  chart: {
    marginBottom: 8,
  },
  chartInfo: {
    alignItems: "center",
  },
  chartInfoText: {
    fontSize: 12,
  },
  noDataContainer: {
    height: 200,
    justifyContent: "center",
    alignItems: "center",
  },
  noDataText: {
    fontSize: 16,
  },
  infoCard: {
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 12,
    alignItems: "flex-start",
  },
  infoLabel: {
    fontSize: 14,
    minWidth: 100,
    marginRight: 8,
  },
  infoValue: {
    fontSize: 14,
    flex: 1,
    fontFamily: "monospace",
  },
  timelineSelector: {
    flexDirection: "row",
    marginBottom: 16,
    borderRadius: 8,
    padding: 4,
  },
  timelineOption: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginHorizontal: 2,
    alignItems: "center",
  },
  timelineOptionText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
