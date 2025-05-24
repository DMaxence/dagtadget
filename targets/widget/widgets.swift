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

// Helper function to get localized string
func localizedString(_ key: String) -> String {
    return NSLocalizedString(key, comment: "")
}

struct Provider: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> SimpleEntry {
        SimpleEntry(date: Date(), configuration: EnhancedWidgetConfigIntent(), widgetData: nil)
    }

    func snapshot(for configuration: EnhancedWidgetConfigIntent, in context: Context) async -> SimpleEntry {
        let widgetData = fetchWidgetData(for: configuration.selectedWidget?.id)
        return SimpleEntry(date: Date(), configuration: configuration, widgetData: widgetData)
    }
    
    func timeline(for configuration: EnhancedWidgetConfigIntent, in context: Context) async -> Timeline<SimpleEntry> {
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
                    Text(localizedString("widget.loading"))
                    ProgressView()
                }
            } else {
                // No widget selected
                VStack {
                    Text(localizedString("widget.noSelection"))
                        .font(.headline)
                    
                    Text(localizedString("widget.configureInstructions"))
                        .font(.caption)
                        .multilineTextAlignment(.center)
                        .padding()
                }
            }
        }
        .widgetURL(createDeepLinkURL())
    }
    
    // Default view for systemSmall and other sizes
    private func defaultView(widgetData: WidgetData) -> some View {
        VStack(alignment: .center, spacing: 0) {
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
                Text(localizedString("widget.error"))
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
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(color(from: widgetData.color) ?? Color(.systemBackground))
    }
    
    // Circular accessory view
    private func accessoryCircularView(widgetData: WidgetData) -> some View {
        VStack(spacing: 1) {
            Text(widgetData.name)
                .font(.system(size: 8))
                .foregroundColor(.white)
                .lineLimit(1)
            
            if let error = widgetData.lastError, !error.isEmpty {
                Image(systemName: "exclamationmark.triangle")
                    .font(.system(size: 12))
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
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(.systemBackground).opacity(0.8))
        .clipShape(RoundedRectangle(cornerRadius: 50, style: .continuous))
    }
    
    // Rectangular accessory view
    private func accessoryRectangularView(widgetData: WidgetData) -> some View {
        VStack(alignment: .leading, spacing: 1) {
            Text(widgetData.name)
                .font(.system(size: 14))
                .fontWeight(.medium)
                .foregroundColor(.white)
                .lineLimit(1)
            
          Spacer()
            
            if let error = widgetData.lastError, !error.isEmpty {
                HStack {
                    Image(systemName: "exclamationmark.triangle")
                        .font(.system(size: 14))
                    Text(localizedString("widget.error"))
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
            }
            
            Spacer()
            
            if let lastFetched = widgetData.lastFetched {
                Text(formattedDate(timeInterval: lastFetched))
                    .font(.system(size: 8))
                    .foregroundColor(.white.opacity(0.8))
            }
        }
        .padding(10)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .background(Color(.systemBackground).opacity(0.8))
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
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

struct widget: Widget {
    let kind: String = "widget"

    var body: some WidgetConfiguration {
        AppIntentConfiguration(kind: kind, intent: EnhancedWidgetConfigIntent.self, provider: Provider()) { entry in
            widgetEntryView(entry: entry)
                .containerBackground(.fill.tertiary, for: .widget)
        }
        .contentMarginsDisabled()
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
    widget()
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
            lastError: nil
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
            lastError: nil
        )
    )
}
