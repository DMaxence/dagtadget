import React from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Widget } from "@/types/widget";
import { 
  calculateGrowthPercentage, 
  getTrend, 
  getHistorySummary, 
  formatGrowthPercentage,
  getTimeRangeLabel 
} from "@/utils/historyUtils";
import { useThemeColor } from "@/hooks/useThemeColor";
import { t } from "@/constants/i18n";

interface WidgetAnalyticsProps {
  widget: Widget;
}

export const WidgetAnalytics: React.FC<WidgetAnalyticsProps> = ({ widget }) => {
  const textColor = useThemeColor({ light: "#333", dark: "#fff" }, "text");
  const cardColor = useThemeColor({ light: "#fff", dark: "#1e1e1e" }, "background");
  const accentColor = useThemeColor({ light: "#007AFF", dark: "#0A84FF" }, "tint");
  
  const history = widget.dataSource.history || [];
  
  // Various time periods for analysis
  const timePeriods = [
    { hours: 1, label: t("time.1h") },
    { hours: 24, label: t("time.24h") },
    { hours: 168, label: t("time.7d") },
    { hours: 720, label: t("time.30d") },
  ];

  const formatValue = (value: number | null) => {
    if (value === null) return "—";
    
    try {
      const locale = Intl.NumberFormat().resolvedOptions().locale;
      return new Intl.NumberFormat(locale, {
        maximumFractionDigits: 2,
      }).format(value);
    } catch (e) {
      return value.toString();
    }
  };

  const getTrendIcon = (trend: string | null) => {
    switch (trend) {
      case "up":
        return <Ionicons name="trending-up" size={16} color="#34c759" />;
      case "down":
        return <Ionicons name="trending-down" size={16} color="#ff3b30" />;
      case "stable":
        return <Ionicons name="remove" size={16} color="#8e8e93" />;
      default:
        return <Ionicons name="help" size={16} color="#8e8e93" />;
    }
  };

  if (history.length === 0) {
    return (
      <ThemedView style={[styles.container, { backgroundColor: cardColor }]}>
        <ThemedText style={[styles.title, { color: textColor }]}>
          {t("analytics.title")}
        </ThemedText>
        <ThemedText style={[styles.emptyText, { color: textColor }]}>
          {t("analytics.noData")}
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ScrollView style={styles.scrollContainer}>
      <ThemedView style={[styles.container, { backgroundColor: cardColor }]}>
        <ThemedText style={[styles.title, { color: textColor }]}>
          {t("analytics.forWidget", { name: widget.name })}
        </ThemedText>
        
        {/* Growth Percentages */}
        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: textColor }]}>
            {t("analytics.growthPercentage")}
          </ThemedText>
          <View style={styles.metricsGrid}>
            {timePeriods.map((period) => {
              const growth = calculateGrowthPercentage(history, period.hours);
              return (
                <View key={period.label} style={[styles.metricCard, { backgroundColor: cardColor }]}>
                  <ThemedText style={[styles.metricLabel, { color: textColor }]}>
                    {period.label}
                  </ThemedText>
                  <ThemedText
                    style={[
                      styles.metricValue, 
                      { 
                        color: growth === null ? textColor : 
                               growth >= 0 ? "#34c759" : "#ff3b30" 
                      }
                    ]}
                  >
                    {formatGrowthPercentage(growth)}
                  </ThemedText>
                </View>
              );
            })}
          </View>
        </View>

        {/* Trend Analysis */}
        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: textColor }]}>
            {t("analytics.trendAnalysis")}
          </ThemedText>
          <View style={styles.trendContainer}>
            <View style={styles.trendItem}>
              {getTrendIcon(getTrend(history, 3))}
              <ThemedText style={[styles.trendText, { color: textColor }]}>
                {t("analytics.shortTerm")}
              </ThemedText>
            </View>
            <View style={styles.trendItem}>
              {getTrendIcon(getTrend(history, 10))}
              <ThemedText style={[styles.trendText, { color: textColor }]}>
                {t("analytics.longTerm")}
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Summary Statistics */}
        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: textColor }]}>
            {t("analytics.summary")}
          </ThemedText>
          {(() => {
            const summary = getHistorySummary(history, 168);
            return (
              <View style={styles.summaryGrid}>
                <View style={[styles.summaryCard, { backgroundColor: cardColor }]}>
                  <ThemedText style={[styles.summaryLabel, { color: textColor }]}>
                    {t("analytics.minimum")}
                  </ThemedText>
                  <ThemedText style={[styles.summaryValue, { color: accentColor }]}>
                    {widget.prefix || ""}{formatValue(summary.min)}{widget.suffix || ""}
                  </ThemedText>
                </View>
                <View style={[styles.summaryCard, { backgroundColor: cardColor }]}>
                  <ThemedText style={[styles.summaryLabel, { color: textColor }]}>
                    {t("analytics.maximum")}
                  </ThemedText>
                  <ThemedText style={[styles.summaryValue, { color: accentColor }]}>
                    {widget.prefix || ""}{formatValue(summary.max)}{widget.suffix || ""}
                  </ThemedText>
                </View>
                <View style={[styles.summaryCard, { backgroundColor: cardColor }]}>
                  <ThemedText style={[styles.summaryLabel, { color: textColor }]}>
                    {t("analytics.average")}
                  </ThemedText>
                  <ThemedText style={[styles.summaryValue, { color: accentColor }]}>
                    {widget.prefix || ""}{formatValue(summary.average)}{widget.suffix || ""}
                  </ThemedText>
                </View>
                <View style={[styles.summaryCard, { backgroundColor: cardColor }]}>
                  <ThemedText style={[styles.summaryLabel, { color: textColor }]}>
                    {t("analytics.dataPoints")}
                  </ThemedText>
                  <ThemedText style={[styles.summaryValue, { color: accentColor }]}>
                    {summary.dataPoints}
                  </ThemedText>
                </View>
              </View>
            );
          })()}
        </View>

        {/* Recent History */}
        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: textColor }]}>
            {t("analytics.recentValues")}
          </ThemedText>
          <View style={styles.historyList}>
            {history
              .slice(-5)
              .reverse()
              .map((point, index) => (
                <View key={point.timestamp} style={styles.historyItem}>
                  <View style={styles.historyLeft}>
                    <ThemedText style={[styles.historyValue, { color: textColor }]}>
                      {widget.prefix || ""}{point.value}{widget.suffix || ""}
                    </ThemedText>
                    {point.error && (
                      <ThemedText style={[styles.historyError, { color: "#ff3b30" }]}>
                        {t("analytics.error", { error: point.error })}
                      </ThemedText>
                    )}
                  </View>
                  <ThemedText style={[styles.historyTime, { color: textColor }]}>
                    {new Date(point.timestamp).toLocaleString()}
                  </ThemedText>
                </View>
              ))}
          </View>
        </View>
      </ThemedView>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
  },
  container: {
    padding: 16,
    borderRadius: 12,
    margin: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 16,
    textAlign: "center",
    opacity: 0.7,
    marginVertical: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  metricCard: {
    flex: 1,
    minWidth: 80,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  metricLabel: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: "bold",
  },
  trendContainer: {
    gap: 12,
  },
  trendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  trendText: {
    fontSize: 16,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  summaryCard: {
    flex: 1,
    minWidth: 120,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  summaryLabel: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  historyList: {
    gap: 8,
  },
  historyItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  historyLeft: {
    flex: 1,
  },
  historyValue: {
    fontSize: 16,
    fontWeight: "500",
  },
  historyError: {
    fontSize: 12,
    marginTop: 2,
  },
  historyTime: {
    fontSize: 12,
    opacity: 0.7,
  },
}); 