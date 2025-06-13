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

// Helper to check iOS version for Chart Widget
@available(iOS 13.0, *)
extension ProcessInfo {
    var isChartIOS26OrLater: Bool {
        if #available(iOS 26.0, *) {
            return true
        } else {
            return false
        }
    }
}

// Liquid Glass Theme Styles for Chart Widget
struct ChartLiquidGlassStyle {
    static func apply(to view: some View, with color: Color?) -> some View {
        if ProcessInfo.processInfo.isChartIOS26OrLater {
            return AnyView(
                view
                    .background(
                        ZStack {
                            // Base glass layer
                            RoundedRectangle(cornerRadius: 20, style: .continuous)
                                .fill(.ultraThinMaterial)
                                .opacity(0.7)
                            
                            // Liquid glass gradient overlay
                            RoundedRectangle(cornerRadius: 20, style: .continuous)
                                .fill(
                                    LinearGradient(
                                        colors: [
                                            (color ?? .blue).opacity(0.3),
                                            (color ?? .blue).opacity(0.1),
                                            .white.opacity(0.2),
                                            (color ?? .blue).opacity(0.2)
                                        ],
                                        startPoint: .topLeading,
                                        endPoint: .bottomTrailing
                                    )
                                )
                            
                            // Liquid glass shimmer effect
                            RoundedRectangle(cornerRadius: 20, style: .continuous)
                                .stroke(
                                    LinearGradient(
                                        colors: [
                                            .white.opacity(0.6),
                                            .clear,
                                            .white.opacity(0.3)
                                        ],
                                        startPoint: .topLeading,
                                        endPoint: .bottomTrailing
                                    ),
                                    lineWidth: 1
                                )
                        }
                    )
                    .shadow(color: (color ?? .blue).opacity(0.3), radius: 10, x: 0, y: 5)
                    .overlay(
                        // Liquid glass highlight
                        RoundedRectangle(cornerRadius: 20, style: .continuous)
                            .stroke(.white.opacity(0.4), lineWidth: 0.5)
                            .blur(radius: 0.5)
                    )
            )
        } else {
            return AnyView(
                view
                    .background(color ?? Color(.systemBackground))
            )
        }
    }
    
    static func applyAccessoryRectangular(to view: some View, with color: Color?) -> some View {
        if ProcessInfo.processInfo.isChartIOS26OrLater {
            return AnyView(
                view
                    .background(
                        ZStack {
                            RoundedRectangle(cornerRadius: 12, style: .continuous)
                                .fill(.ultraThinMaterial)
                                .opacity(0.8)
                            
                            RoundedRectangle(cornerRadius: 12, style: .continuous)
                                .fill(
                                    LinearGradient(
                                        colors: [
                                            (color ?? .blue).opacity(0.3),
                                            .white.opacity(0.2),
                                            (color ?? .blue).opacity(0.2)
                                        ],
                                        startPoint: .topLeading,
                                        endPoint: .bottomTrailing
                                    )
                                )
                            
                            RoundedRectangle(cornerRadius: 12, style: .continuous)
                                .stroke(.white.opacity(0.4), lineWidth: 0.5)
                        }
                    )
                    .shadow(color: (color ?? .blue).opacity(0.3), radius: 6, x: 0, y: 3)
            )
        } else {
            return AnyView(
                view
                    .background(Color(.systemBackground).opacity(0.7))
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            )
        }
    }
}

struct ChartProvider: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> ChartEntry {
        // For placeholder, show configuration prompt
        return ChartEntry(date: Date(), configuration: EnhancedWidgetConfigIntent(), widgetData: nil)
    }

    func snapshot(for configuration: EnhancedWidgetConfigIntent, in context: Context) async -> ChartEntry {
        // For snapshot, always show the first available widget
        let widgetData = fetchFirstAvailableWidget()
        return ChartEntry(date: Date(), configuration: configuration, widgetData: widgetData)
    }
    
    func timeline(for configuration: EnhancedWidgetConfigIntent, in context: Context) async -> Timeline<ChartEntry> {
        // For timeline, only show data if a widget is selected
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
    
    // Helper function to fetch the first available widget for placeholder
    private func fetchFirstAvailableWidget() -> ChartWidgetData? {
        guard let groupDefaults = UserDefaults(suiteName: "group.com.datadget") else {
            return nil
        }
        
        // Get all keys in the UserDefaults and find widgets, then sort for consistency
        let allKeys = Array(groupDefaults.dictionaryRepresentation().keys).sorted()
        
        for key in allKeys {
            if let data = groupDefaults.data(forKey: key),
               let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               let name = json["name"] as? String {
                
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
                    id: key,
                    name: name,
                    prefix: json["prefix"] as? String,
                    suffix: json["suffix"] as? String,
                    color: json["color"] as? String,
                    value: value,
                    lastFetched: json["lastFetched"] as? TimeInterval,
                    lastError: json["lastError"] as? String,
                    refreshIntervalMs: json["refreshIntervalMs"] as? Double,
                    growthPercentage: json["growthPercentage"] as? Double,
                    growthDirection: json["growthDirection"] as? String,
                    chartData: chartData
                )
                return widgetData
            }
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
                // No widget selected - show configuration prompt
                VStack(spacing: 8) {
                    Image(systemName: "gear")
                        .font(.system(size: 24))
                        .foregroundColor(.blue)
                    
                    Text(NSLocalizedString("widget.needsConfiguration", comment: ""))
                        .font(.headline)
                        .multilineTextAlignment(.center)
                    
                    Text(NSLocalizedString("widget.tapToConfigureInstructions", comment: ""))
                        .font(.caption)
                        .multilineTextAlignment(.center)
                        .foregroundColor(.secondary)
                }
                .padding()
            }
        }
        .widgetURL(createDeepLinkURL())
    }
    
    // Chart view for accessoryRectangular widgets with liquid glass theme
    private func chartAccessoryRectangularView(widgetData: ChartWidgetData) -> some View {
        let widgetColor = color(from: widgetData.color)
        
        return ChartLiquidGlassStyle.applyAccessoryRectangular(
            to: VStack(alignment: .leading, spacing: 2) {
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
                .padding(.top, 10)
                .padding(.horizontal, 10)
                
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
                            .font(.system(size: 18, weight: .bold))
                            .foregroundColor(.white)
                            .lineLimit(1)
                            .minimumScaleFactor(0.7)
                            .padding(.horizontal, 8)
                    }
                    
                    // Mini chart for rectangular accessory
                    if let chartData = widgetData.chartData, chartData.count > 1 {
                        miniChartView(data: chartData, contentColor: .white)
                            .frame(height: 22)
                    } else {
                        // Show last updated if no chart data
                        if let lastFetched = widgetData.lastFetched {
                            Text(shortFormattedDate(timeInterval: lastFetched))
                                .font(.system(size: 8))
                                .foregroundColor(.white.opacity(0.6))
                                .padding(.horizontal, 8)
                        }
                    }
                }
                
                if widgetData.lastError != nil || (widgetData.value?.isEmpty ?? true) {
                    if widgetData.lastError == nil {
                        ProgressView()
                            .scaleEffect(0.5)
                            .tint(.white)
                    }
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading),
            with: widgetColor
        )
    }
    
    // Chart view for systemSmall and systemMedium widgets with liquid glass theme
    private func chartSystemSmallView(widgetData: ChartWidgetData) -> some View {
        let widgetColor = color(from: widgetData.color)
        
        return ChartLiquidGlassStyle.apply(
            to: VStack(alignment: .leading, spacing: 4) {
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
                        .tint(.white)
                }

                Spacer()
                
                // Chart
                if let chartData = widgetData.chartData, chartData.count > 1 {
                    miniChartView(data: chartData, contentColor: .white)
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
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading),
            with: widgetColor
        )
    }
    
    // Mini chart view for displaying trend data with adaptive colors
    private func miniChartView(data: [ChartDataPoint], contentColor: Color) -> some View {
        GeometryReader { geometry in
            let minValue = data.map { $0.value }.min() ?? 0
            let maxValue = data.map { $0.value }.max() ?? 1
            let range = maxValue - minValue
            let width = geometry.size.width
            let height = geometry.size.height
            
            // Create smooth curved path
            Path { path in
                guard data.count > 1 else { return }
                
                let points = data.enumerated().map { index, point in
                    let x = CGFloat(index) / CGFloat(data.count - 1) * width
                    let normalizedValue = range > 0 ? (point.value - minValue) / range : 0.5
                    let y = height - (CGFloat(normalizedValue) * height)
                    return CGPoint(x: x, y: y)
                }
                
                path.move(to: points[0])
                
                for i in 1..<points.count {
                    let currentPoint = points[i]
                    let previousPoint = points[i-1]
                    
                    // Calculate control points for smooth curves
                    let controlPointX = (previousPoint.x + currentPoint.x) / 2
                    let controlPoint1 = CGPoint(x: controlPointX, y: previousPoint.y)
                    let controlPoint2 = CGPoint(x: controlPointX, y: currentPoint.y)
                    
                    path.addCurve(to: currentPoint, control1: controlPoint1, control2: controlPoint2)
                }
            }
            .stroke(contentColor.opacity(0.8), lineWidth: 2)
            
            // Add subtle gradient fill
            Path { path in
                guard data.count > 1 else { return }
                
                let points = data.enumerated().map { index, point in
                    let x = CGFloat(index) / CGFloat(data.count - 1) * width
                    let normalizedValue = range > 0 ? (point.value - minValue) / range : 0.5
                    let y = height - (CGFloat(normalizedValue) * height)
                    return CGPoint(x: x, y: y)
                }
                
                path.move(to: points[0])
                
                for i in 1..<points.count {
                    let currentPoint = points[i]
                    let previousPoint = points[i-1]
                    
                    // Calculate control points for smooth curves
                    let controlPointX = (previousPoint.x + currentPoint.x) / 2
                    let controlPoint1 = CGPoint(x: controlPointX, y: previousPoint.y)
                    let controlPoint2 = CGPoint(x: controlPointX, y: currentPoint.y)
                    
                    path.addCurve(to: currentPoint, control1: controlPoint1, control2: controlPoint2)
                }
                
                path.addLine(to: CGPoint(x: width, y: height))
                path.addLine(to: CGPoint(x: 0, y: height))
                path.closeSubpath()
            }
            .fill(
                LinearGradient(
                    gradient: Gradient(colors: [contentColor.opacity(0.2), contentColor.opacity(0.02)]),
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
