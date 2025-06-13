import WidgetKit
import SwiftUI

// Model for widget data fetched from shared storage
struct WidgetData: Decodable {
    var id: String
    var name: String
    var prefix: String?
    var suffix: String?
    var color: String?
    var value: String?
    var lastFetched: TimeInterval?
    var lastError: String?
    var refreshIntervalMs: Double? // Added refresh interval in milliseconds
}

// Helper to check iOS version
@available(iOS 13.0, *)
extension ProcessInfo {
    var isIOS26OrLater: Bool {
        if #available(iOS 26.0, *) {
            return true
        } else {
            return false
        }
    }
}

// Liquid Glass Theme Styles
struct LiquidGlassStyle {
    static func apply(to view: some View, with color: Color?) -> some View {
        if ProcessInfo.processInfo.isIOS26OrLater {
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
    
    static func applyAccessoryCircular(to view: some View, with color: Color?) -> some View {
        if ProcessInfo.processInfo.isIOS26OrLater {
            return AnyView(
                view
                    .background(
                        ZStack {
                            Circle()
                                .fill(.ultraThinMaterial)
                                .opacity(0.8)
                            
                            Circle()
                                .fill(
                                    RadialGradient(
                                        colors: [
                                            (color ?? .blue).opacity(0.4),
                                            (color ?? .blue).opacity(0.1),
                                            .white.opacity(0.3)
                                        ],
                                        center: .topLeading,
                                        startRadius: 5,
                                        endRadius: 25
                                    )
                                )
                            
                            Circle()
                                .stroke(.white.opacity(0.5), lineWidth: 0.5)
                        }
                    )
                    .shadow(color: (color ?? .blue).opacity(0.4), radius: 8, x: 0, y: 3)
            )
        } else {
            return AnyView(
                view
                    .background(Color(.systemBackground).opacity(0.7))
                    .clipShape(RoundedRectangle(cornerRadius: 50, style: .continuous))
            )
        }
    }
    
    static func applyAccessoryRectangular(to view: some View, with color: Color?) -> some View {
        if ProcessInfo.processInfo.isIOS26OrLater {
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
                    .background(Color(.systemBackground).opacity(0.8))
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            )
        }
    }
}

struct Provider: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> SimpleEntry {
        // For placeholder, show configuration prompt
        return SimpleEntry(date: Date(), configuration: EnhancedWidgetConfigIntent(), widgetData: nil)
    }

    func snapshot(for configuration: EnhancedWidgetConfigIntent, in context: Context) async -> SimpleEntry {
        // For snapshot, always show the first available widget
        let widgetData = fetchFirstAvailableWidget()
        return SimpleEntry(date: Date(), configuration: configuration, widgetData: widgetData)
    }
    
    func timeline(for configuration: EnhancedWidgetConfigIntent, in context: Context) async -> Timeline<SimpleEntry> {
        // For timeline, only show data if a widget is selected
        let widgetData = fetchWidgetData(for: configuration.selectedWidget?.id)
        
        var entries: [SimpleEntry] = []
        
        // Current entry
        let currentEntry = SimpleEntry(date: Date(), configuration: configuration, widgetData: widgetData)
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
    private func fetchWidgetData(for widgetId: String?) -> WidgetData? {
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
            
            let widgetData = WidgetData(
                id: widgetId,
                name: json["name"] as? String ?? "Widget",
                prefix: json["prefix"] as? String,
                suffix: json["suffix"] as? String,
                color: json["color"] as? String,
                value: value,
                lastFetched: json["lastFetched"] as? TimeInterval,
                lastError: json["lastError"] as? String,
                refreshIntervalMs: json["refreshIntervalMs"] as? Double // Read the refresh interval
            )
            return widgetData
        }
        
        return nil
    }
    
    // Helper function to fetch the first available widget for placeholder
    private func fetchFirstAvailableWidget() -> WidgetData? {
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
                
                let widgetData = WidgetData(
                    id: key,
                    name: name,
                    prefix: json["prefix"] as? String,
                    suffix: json["suffix"] as? String,
                    color: json["color"] as? String,
                    value: value,
                    lastFetched: json["lastFetched"] as? TimeInterval,
                    lastError: json["lastError"] as? String,
                    refreshIntervalMs: json["refreshIntervalMs"] as? Double
                )
                return widgetData
            }
        }
        
        return nil
    }
}

struct SimpleEntry: TimelineEntry {
    let date: Date
    let configuration: EnhancedWidgetConfigIntent
    let widgetData: WidgetData?
}

struct widgetEntryView : View {
    var entry: Provider.Entry
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
                // If we have widget data, display it
                switch family {
                case .accessoryCircular:
                    accessoryCircularView(widgetData: widgetData)
                case .accessoryRectangular:
                    accessoryRectangularView(widgetData: widgetData)
                default:
                    defaultView(widgetData: widgetData)
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
    
    // Default view for systemSmall and other sizes with liquid glass theme
    private func defaultView(widgetData: WidgetData) -> some View {
        let widgetColor = color(from: widgetData.color)
        
        return LiquidGlassStyle.apply(
            to: VStack(alignment: .center, spacing: 0) {
                HStack {
                    Text(widgetData.name)
                        .font(.headline)
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                        .lineLimit(1)
                        .padding(.top, 16)
                        .padding(.leading, 16)
                    
                    Spacer()
                }
                
                Spacer()
                
                if let error = widgetData.lastError, !error.isEmpty {
                    // Show error state
                    Image(systemName: "exclamationmark.triangle")
                        .font(.system(size: 24))
                        .foregroundColor(.orange)
                    Text(NSLocalizedString("widget.error", comment: ""))
                        .font(.caption)
                        .foregroundColor(.white)
                } else if let value = widgetData.value, !value.isEmpty {
                    // Format the value with prefix and suffix
                    Text(formatValue(value, prefix: widgetData.prefix, suffix: widgetData.suffix))
                        .font(.system(size: 32, weight: .bold))
                        .foregroundColor(.white)
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)
                        .padding(.horizontal, 16)
                } else {
                    // Loading state
                    ProgressView()
                        .tint(.white)
                }
                
                Spacer()
                
                if let lastFetched = widgetData.lastFetched {
                    HStack {
                        Text(formattedDate(timeInterval: lastFetched))
                            .font(.caption2)
                            .foregroundColor(.white.opacity(0.8))
                            .padding(.bottom, 16)
                            .padding(.horizontal, 16)
                        Spacer()
                    }
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity),
            with: widgetColor
        )
    }
    
    // Circular accessory view with liquid glass theme
    private func accessoryCircularView(widgetData: WidgetData) -> some View {
        let widgetColor = color(from: widgetData.color)
        
        return LiquidGlassStyle.applyAccessoryCircular(
            to: VStack(spacing: 1) {
                Text(widgetData.name)
                    .font(.system(size: 8))
                    .foregroundColor(.white)
                    .lineLimit(1)

                if let error = widgetData.lastError, !error.isEmpty {
                    Image(systemName: "exclamationmark.triangle")
                        .font(.system(size: 14))
                        .foregroundColor(.orange)
                } else if let value = widgetData.value, !value.isEmpty {
                    Text(formatValue(value, prefix: widgetData.prefix, suffix: widgetData.suffix))
                        .font(.system(size: 16))
                        .fontWeight(.semibold)
                        .foregroundColor(.white)
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)
                } else {
                    ProgressView()
                        .scaleEffect(0.7)
                        .tint(.white)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity),
            with: widgetColor
        )
    }
    
    // Rectangular accessory view with liquid glass theme
    private func accessoryRectangularView(widgetData: WidgetData) -> some View {
        let widgetColor = color(from: widgetData.color)
        
        return LiquidGlassStyle.applyAccessoryRectangular(
            to: VStack(alignment: .leading, spacing: 1) {
                Text(widgetData.name)
                    .font(.system(size: 14))
                    .fontWeight(.medium)
                    .foregroundColor(.white)
                    .lineLimit(1)
                
                if let error = widgetData.lastError, !error.isEmpty {
                    HStack {
                        Image(systemName: "exclamationmark.triangle")
                            .font(.system(size: 14))
                            .foregroundColor(.orange)
                        Text(NSLocalizedString("widget.error", comment: ""))
                            .font(.system(size: 12))
                            .foregroundColor(.white)
                    }
                } else if let value = widgetData.value, !value.isEmpty {
                    Text(formatValue(value, prefix: widgetData.prefix, suffix: widgetData.suffix))
                        .font(.system(size: 22, weight: .bold))
                        .foregroundColor(.white)
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)
                } else {
                    ProgressView()
                        .tint(.white)
                }
                
                if let lastFetched = widgetData.lastFetched {
                    Text(formattedDate(timeInterval: lastFetched))
                        .font(.system(size: 8))
                        .foregroundColor(.white.opacity(0.8))
                }
            }
            .padding(10)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading),
            with: widgetColor
        )
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

struct dataWidget: Widget {
    let kind: String = "dataWidget"

    var body: some WidgetConfiguration {
        AppIntentConfiguration(kind: kind, intent: EnhancedWidgetConfigIntent.self, provider: Provider()) { entry in
            widgetEntryView(entry: entry)
                .containerBackground(.fill.tertiary, for: .widget)
        }
        .contentMarginsDisabled()
        .configurationDisplayName("Data Widget")
        .description("Shows basic data values with growth indicators")
        .supportedFamilies([.accessoryCircular,
                            .accessoryRectangular,
                            .systemSmall, .systemMedium])
    }
}

// Sample configuration for preview
extension EnhancedWidgetConfigIntent {
    fileprivate static var preview: EnhancedWidgetConfigIntent {
        let intent = EnhancedWidgetConfigIntent()
        return intent
    }
}

#Preview(as: .systemSmall) {
    dataWidget()
} timeline: {
    SimpleEntry(
        date: .now, 
        configuration: .preview,
        widgetData: WidgetData(
            id: "preview", 
            name: "Bitcoin Price", 
            prefix: "$", 
            suffix: "", 
            color: "#F7931A",
            value: "43,278.65",
            lastFetched: Date().timeIntervalSince1970,
            lastError: nil,
            refreshIntervalMs: 900000
        )
    )
    
    SimpleEntry(
        date: .now, 
        configuration: .preview,
        widgetData: WidgetData(
            id: "preview2", 
            name: "API Status", 
            prefix: "", 
            suffix: "", 
            color: "#4CAF50",
            value: "99.9",
            lastFetched: Date().timeIntervalSince1970,
            lastError: nil,
            refreshIntervalMs: 300000
        )
    )

    SimpleEntry(
        date: .now, 
        configuration: .preview,
        widgetData: WidgetData(
            id: "preview2", 
            name: "API Status", 
            prefix: "", 
            suffix: "", 
            color: "#4CAF50",
            value: "Online",
            lastFetched: Date().timeIntervalSince1970,
            lastError: nil,
            refreshIntervalMs: 300000
        )
    )
    SimpleEntry(
        date: .now, 
        configuration: .preview,
        widgetData: WidgetData(
            id: "preview2", 
            name: "Long Text API", 
            prefix: "", 
            suffix: "", 
            color: "#4CAF50",
            value: "This is a long text that should be wrapped",
            lastFetched: Date().timeIntervalSince1970,
            lastError: nil,
            refreshIntervalMs: 300000
        )
    )
}
