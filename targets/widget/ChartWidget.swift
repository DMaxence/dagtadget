import WidgetKit
import SwiftUI

// Model for widget data fetched from shared storage
struct ChartWidgetData: Decodable {
    var id: String
    var name: String
    var prefix: String?
    var suffix: String?
    var color: String?
    var value: String?
    var lastFetched: TimeInterval?
    var lastError: String?
    var refreshIntervalMs: Double? // Added refresh interval in milliseconds
    var growthPercentage: Double? // Growth percentage for trending widgets
    var growthDirection: String? // "up", "down", or "stable"
    var chartData: [ChartDataPoint]? // Chart data points for chart widgets
}

// Chart data point structure
struct ChartDataPoint: Decodable {
    var timestamp: TimeInterval
    var value: Double
}

struct ChartProvider: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> ChartEntry {
        ChartEntry(date: Date(), configuration: EnhancedWidgetConfigIntent(), widgetData: nil)
    }

    func snapshot(for configuration: EnhancedWidgetConfigIntent, in context: Context) async -> ChartEntry {
        let widgetData = fetchWidgetData(for: configuration.selectedWidget?.id)
        return ChartEntry(date: Date(), configuration: configuration, widgetData: widgetData)
    }
    
    func timeline(for configuration: EnhancedWidgetConfigIntent, in context: Context) async -> Timeline<ChartEntry> {
        let widgetData = fetchWidgetData(for: configuration.selectedWidget?.id)
        
        var entries: [ChartEntry] = []
        
        // Current entry
        let currentEntry = ChartEntry(date: Date(), configuration: configuration, widgetData: widgetData)
        entries.append(currentEntry)
        
        // Calculate next update time
        let defaultRefreshInterval: TimeInterval = 15 * 60 // 15 minutes default
        var refreshInterval = defaultRefreshInterval

        if let specificIntervalMs = widgetData?.refreshIntervalMs, specificIntervalMs > 0 {
            refreshInterval = specificIntervalMs / 1000 // Convert ms to seconds
        }

        let nextUpdateDate = Date().addingTimeInterval(refreshInterval)
        
        return Timeline(entries: entries, policy: .after(nextUpdateDate))
    }
    
    // Helper function to fetch widget data from shared container
    private func fetchWidgetData(for widgetId: String?) -> ChartWidgetData? {
        guard let widgetId = widgetId,
              let groupDefaults = UserDefaults(suiteName: "group.com.datadget"),
              let data = groupDefaults.data(forKey: widgetId) else {
            return nil
        }
        
        // Try to decode the data
        if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
            // Get the value, ensuring it's not an empty string
            var value = json["value"] as? String ?? (json["lastValue"] as? String)
            if let val = value, val.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                value = nil
            }
            
            // Parse chart data if available
            var chartData: [ChartDataPoint]? = nil
            if let chartDataArray = json["chartData"] as? [[String: Any]] {
                chartData = chartDataArray.compactMap { pointData in
                    guard let timestamp = pointData["timestamp"] as? TimeInterval,
                          let value = pointData["value"] as? Double else {
                        return nil
                    }
                    return ChartDataPoint(timestamp: timestamp, value: value)
                }
            }
            
            let widgetData = ChartWidgetData(
                id: widgetId,
                name: json["name"] as? String ?? "Widget",
                prefix: json["prefix"] as? String,
                suffix: json["suffix"] as? String,
                color: json["color"] as? String,
                value: value,
                lastFetched: json["lastFetched"] as? TimeInterval,
                lastError: json["lastError"] as? String,
                refreshIntervalMs: json["refreshIntervalMs"] as? Double, // Read the refresh interval
                growthPercentage: json["growthPercentage"] as? Double, // Read growth percentage
                growthDirection: json["growthDirection"] as? String, // Read growth direction
                chartData: chartData // Read chart data points
            )
            return widgetData
        }
        
        return nil
    }
}

struct ChartEntry: TimelineEntry {
    let date: Date
    let configuration: EnhancedWidgetConfigIntent
    let widgetData: ChartWidgetData?
}

struct chartWidgetEntryView : View {
    var entry: ChartProvider.Entry
    @Environment(\.widgetFamily) var family
    
    // Helper to convert hex color string to Color
    private func color(from hexString: String?) -> Color? {
        guard let hexString = hexString else { return nil }
        
        var formattedHex = hexString.trimmingCharacters(in: .whitespacesAndNewlines)
        formattedHex = formattedHex.replacingOccurrences(of: "#", with: "")
        
        var rgb: UInt64 = 0
        Scanner(string: formattedHex).scanHexInt64(&rgb)
        
        return Color(
            red: Double((rgb & 0xFF0000) >> 16) / 255.0,
            green: Double((rgb & 0x00FF00) >> 8) / 255.0,
            blue: Double(rgb & 0x0000FF) / 255.0
        )
    }
    
    // Helper to create the deep link URL
    private func createDeepLinkURL() -> URL? {
        if let widgetId = entry.widgetData?.id {
            return URL(string: "datadget://widget/\(widgetId)")
        }
        return URL(string: "datadget://")
    }

    var body: some View {
        Group {
            if let widgetData = entry.widgetData {
                // If we have widget data, display chart views for supported families
                switch family {
                case .accessoryRectangular:
                    chartAccessoryRectangularView(widgetData: widgetData)
                case .systemSmall, .systemMedium:
                    chartSystemSmallView(widgetData: widgetData)
                default:
                    // Fallback for unsupported families
                    VStack {
                        Text(NSLocalizedString("widget.chartTitle", comment: ""))
                            .font(.headline)
                        Text(NSLocalizedString("widget.notSupported", comment: ""))
                            .font(.caption)
                    }
                }
            } else if let widgetId = entry.configuration.selectedWidget?.id {
                // No data yet but widget selected
                VStack {
                    Text(NSLocalizedString("widget.loading", comment: ""))
                    ProgressView()
                }
            } else {
                // No widget selected
                VStack {
                    Text(NSLocalizedString("widget.noSelection", comment: ""))
                        .font(.headline)
                    
                    Text(NSLocalizedString("widget.configureInstructions", comment: ""))
                        .font(.caption)
                        .multilineTextAlignment(.center)
                        .padding()
                }
            }
        }
        .widgetURL(createDeepLinkURL())
    }
    
    // Chart view for accessoryRectangular widgets
    private func chartAccessoryRectangularView(widgetData: ChartWidgetData) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            // Header row with name and growth
            HStack {
                Text(widgetData.name)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(.white)
                    .lineLimit(1)
                
                Spacer()
                
                // Growth indicator
                if let growthPercentage = widgetData.growthPercentage {
                    HStack(spacing: 2) {
                        Image(systemName: growthPercentage >= 0 ? "arrow.up" : "arrow.down")
                            .font(.system(size: 8))
                            .foregroundColor(growthPercentage >= 0 ? .green : .red)
                        
                        Text("\(abs(growthPercentage), specifier: "%.1f")%")
                            .font(.system(size: 8, weight: .medium))
                            .foregroundColor(growthPercentage >= 0 ? .green : .red)
                    }
                }
            }
            .padding(.top, 6)
            .padding(.horizontal, 6)
            
            // Main content
            if let error = widgetData.lastError, !error.isEmpty {
                HStack {
                    Image(systemName: "exclamationmark.triangle")
                        .font(.system(size: 10))
                        .foregroundColor(.orange)
                    Text(NSLocalizedString("widget.error", comment: ""))
                        .font(.system(size: 8))
                        .foregroundColor(.white)
                }
            } else {
                // Value
                if let value = widgetData.value, !value.isEmpty {
                    Text(formatValue(value, prefix: widgetData.prefix, suffix: widgetData.suffix))
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(.white) 
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)
                        .padding(.horizontal, 6)
                }
                
                // Mini chart for rectangular accessory
                if let chartData = widgetData.chartData, chartData.count > 1 {
                    miniChartView(data: chartData)
                        .frame(height: 20)
                } else {
                    // Show last updated if no chart data
                    if let lastFetched = widgetData.lastFetched {
                        Text(shortFormattedDate(timeInterval: lastFetched))
                            .font(.system(size: 8))
                            .foregroundColor(.white.opacity(0.6))
                    }
                }
            }
            
            if widgetData.lastError != nil || (widgetData.value?.isEmpty ?? true) {
                if widgetData.lastError == nil {
                    ProgressView()
                        .scaleEffect(0.5)
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .background(Color(.systemBackground).opacity(0.7))
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }
    
    // Chart view for systemSmall and systemMedium widgets
    private func chartSystemSmallView(widgetData: ChartWidgetData) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            // Header with name and growth
            HStack {
                Text(widgetData.name)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(.white)
                    .lineLimit(1)
                
                Spacer()
                
                if let growthPercentage = widgetData.growthPercentage {
                    HStack(spacing: 2) {
                        Image(systemName: growthPercentage >= 0 ? "arrow.up" : "arrow.down")
                            .font(.system(size: 10))
                            .foregroundColor(growthPercentage >= 0 ? .green : .red)
                        
                        Text("\(abs(growthPercentage), specifier: "%.1f")%")
                            .font(.system(size: 10, weight: .medium))
                            .foregroundColor(growthPercentage >= 0 ? .green : .red)
                    }
                }
            }

            Spacer()
            
            // Main value
            if let error = widgetData.lastError, !error.isEmpty {
                VStack {
                    Image(systemName: "exclamationmark.triangle")
                        .font(.system(size: 20))
                        .foregroundColor(.orange)
                    Text(NSLocalizedString("widget.error", comment: ""))
                        .font(.caption)
                        .foregroundColor(.white)
                }
                .frame(maxWidth: .infinity)
            } else if let value = widgetData.value, !value.isEmpty {
                Text(formatValue(value, prefix: widgetData.prefix, suffix: widgetData.suffix))
                    .font(.system(size: 24, weight: .bold))
                    .foregroundColor(.white)
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
            } else {
                ProgressView()
                    .frame(maxWidth: .infinity)
            }

            Spacer()
            
            // Chart
            if let chartData = widgetData.chartData, chartData.count > 1 {
                miniChartView(data: chartData)
                    .frame(height: 30)
            } else {
                // Show placeholder if no chart data
                Text(NSLocalizedString("widget.noChartData", comment: ""))
                    .font(.caption2)
                    .foregroundColor(.white.opacity(0.5))
                    .frame(height: 30)
            }
            
            // Last updated
            if let lastFetched = widgetData.lastFetched {
                Text(formattedDate(timeInterval: lastFetched))
                    .font(.caption2)
                    .foregroundColor(.white.opacity(0.7))
            }
        }
        .padding(12)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .background(color(from: widgetData.color) ?? Color(.systemBackground))
    }
    
    // Mini chart view for displaying trend data
    private func miniChartView(data: [ChartDataPoint]) -> some View {
        GeometryReader { geometry in
            let minValue = data.map { $0.value }.min() ?? 0
            let maxValue = data.map { $0.value }.max() ?? 1
            let range = maxValue - minValue
            let width = geometry.size.width
            let height = geometry.size.height
            
            Path { path in
                for (index, point) in data.enumerated() {
                    let x = CGFloat(index) / CGFloat(data.count - 1) * width
                    let normalizedValue = range > 0 ? (point.value - minValue) / range : 0.5
                    let y = height - (CGFloat(normalizedValue) * height)
                    
                    if index == 0 {
                        path.move(to: CGPoint(x: x, y: y))
                    } else {
                        path.addLine(to: CGPoint(x: x, y: y))
                    }
                }
            }
            .stroke(Color.white.opacity(0.8), lineWidth: 2)
            
            // Add gradient fill
            Path { path in
                for (index, point) in data.enumerated() {
                    let x = CGFloat(index) / CGFloat(data.count - 1) * width
                    let normalizedValue = range > 0 ? (point.value - minValue) / range : 0.5
                    let y = height - (CGFloat(normalizedValue) * height)
                    
                    if index == 0 {
                        path.move(to: CGPoint(x: x, y: y))
                    } else {
                        path.addLine(to: CGPoint(x: x, y: y))
                    }
                }
                path.addLine(to: CGPoint(x: width, y: height))
                path.addLine(to: CGPoint(x: 0, y: height))
                path.closeSubpath()
            }
            .fill(
                LinearGradient(
                    gradient: Gradient(colors: [Color.white.opacity(0.3), Color.white.opacity(0.1)]),
                    startPoint: .top,
                    endPoint: .bottom
                )
            )
        }
    }
    
    // Helper to format date in short form for rectangular widgets
    private func shortFormattedDate(timeInterval: TimeInterval) -> String {
        let date = Date(timeIntervalSince1970: timeInterval / 1000)
        let formatter = DateFormatter()
        
        let calendar = Calendar.current
        if calendar.isDateInToday(date) {
            formatter.timeStyle = .short
            return formatter.string(from: date)
        } else {
            formatter.dateFormat = "M/d"
            return formatter.string(from: date)
        }
    }
    
    // Helper to format the value with prefix and suffix
    private func formatValue(_ value: String, prefix: String?, suffix: String?) -> String {
        // Early return for empty values to prevent flash
        if value.isEmpty {
            return "--"
        }
        
        // Try to convert value to a number and format it according to locale
        var formatted = value
        
        // If the value is a number, format it according to locale
        if let doubleValue = Double(value.replacingOccurrences(of: ",", with: ".")) {
            let formatter = NumberFormatter()
            formatter.numberStyle = .decimal
            // Use the device's locale for number formatting
            if let localizedString = formatter.string(from: NSNumber(value: doubleValue)) {
                formatted = localizedString
            }
        }
        
        if let prefix = prefix {
            formatted = prefix + formatted
        }
        
        if let suffix = suffix {
            formatted = formatted + suffix
        }
        
        return formatted
    }
    
    // Helper to format date with localized date and time
    private func formattedDate(timeInterval: TimeInterval) -> String {
        let date = Date(timeIntervalSince1970: timeInterval / 1000) // Assuming milliseconds
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        // Use device locale
        return formatter.string(from: date)
    }
}

struct chartWidget: Widget {
    let kind: String = "chartWidget"

    var body: some WidgetConfiguration {
        AppIntentConfiguration(kind: kind, intent: EnhancedWidgetConfigIntent.self, provider: ChartProvider()) { entry in
            chartWidgetEntryView(entry: entry)
                .containerBackground(.fill.tertiary, for: .widget)
        }
        .contentMarginsDisabled()
        .configurationDisplayName("Chart Widget")
        .description("Shows data with charts and trends")
        .supportedFamilies([.accessoryRectangular,
                            .systemSmall, .systemMedium])
    }
}

// Sample configuration for preview
extension EnhancedWidgetConfigIntent {
    fileprivate static var chartPreview: EnhancedWidgetConfigIntent {
        let intent = EnhancedWidgetConfigIntent()
        return intent
    }
}

#Preview(as: .systemSmall) {
    chartWidget()
} timeline: {
    ChartEntry(
        date: .now, 
        configuration: .chartPreview,
        widgetData: ChartWidgetData(
            id: "preview", 
            name: "Bitcoin Price", 
            prefix: "$", 
            suffix: "", 
            color: "#F7931A",
            value: "43,278.65",
            lastFetched: Date().timeIntervalSince1970,
            lastError: nil,
            refreshIntervalMs: 900000,
            growthPercentage: 5.7,
            growthDirection: "up",
            chartData: [
                ChartDataPoint(timestamp: Date().addingTimeInterval(-86400).timeIntervalSince1970, value: 41000),
                ChartDataPoint(timestamp: Date().addingTimeInterval(-43200).timeIntervalSince1970, value: 42500),
                ChartDataPoint(timestamp: Date().addingTimeInterval(-21600).timeIntervalSince1970, value: 42800),
                ChartDataPoint(timestamp: Date().timeIntervalSince1970, value: 43278.65)
            ]
        )
    )
    
    ChartEntry(
        date: .now, 
        configuration: .chartPreview,
        widgetData: ChartWidgetData(
            id: "preview2", 
            name: "Stock Price", 
            prefix: "$", 
            suffix: "", 
            color: "#4CAF50",
            value: "156.78",
            lastFetched: Date().timeIntervalSince1970,
            lastError: nil,
            refreshIntervalMs: 300000,
            growthPercentage: 2.3,
            growthDirection: "up",
            chartData: [
                ChartDataPoint(timestamp: Date().addingTimeInterval(-86400).timeIntervalSince1970, value: 153),
                ChartDataPoint(timestamp: Date().addingTimeInterval(-43200).timeIntervalSince1970, value: 155),
                ChartDataPoint(timestamp: Date().addingTimeInterval(-21600).timeIntervalSince1970, value: 154),
                ChartDataPoint(timestamp: Date().timeIntervalSince1970, value: 156.78)
            ]
        )
    )
}
