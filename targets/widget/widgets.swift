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
        
        // Calculate next update time based on widget refresh interval or default to 15 minutes
        let refreshInterval: TimeInterval = 15 * 60 // 15 minutes default
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
            let widgetData = WidgetData(
                id: widgetId,
                name: json["name"] as? String ?? "Widget",
                prefix: json["prefix"] as? String,
                suffix: json["suffix"] as? String,
                color: json["color"] as? String,
                value: json["value"] as? String ?? (json["lastValue"] as? String),
                lastFetched: json["lastFetched"] as? TimeInterval,
                lastError: json["lastError"] as? String
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

    var body: some View {
        if let widgetData = entry.widgetData {
            // If we have widget data, display it
            VStack(alignment: .center, spacing: 8) {
                Text(widgetData.name)
                    .font(.headline)
                    .lineLimit(1)
                    .padding(.top, 4)
                
                Spacer()
                
                if let error = widgetData.lastError, !error.isEmpty {
                    // Show error state
                    Image(systemName: "exclamationmark.triangle")
                        .font(.system(size: 24))
                    Text("Error fetching data")
                        .font(.caption)
                } else if let value = widgetData.value {
                    // Format the value with prefix and suffix
                    Text(formatValue(value, prefix: widgetData.prefix, suffix: widgetData.suffix))
                        .font(.system(size: 20, weight: .bold))
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)
                } else {
                    // Loading state
                    ProgressView()
                }
                
                Spacer()
                
                if let lastFetched = widgetData.lastFetched {
                    Text("Updated: \(formattedDate(timeInterval: lastFetched))")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                        .padding(.bottom, 4)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(color(from: widgetData.color) ?? Color(.systemBackground))
        } else if let widgetId = entry.configuration.selectedWidget?.id {
            // No data yet but widget selected
            VStack {
                Text("Loading widget data...")
                ProgressView()
            }
        } else {
            // No widget selected
            VStack {
                Text("No Widget Selected")
                    .font(.headline)
                
                Text("Please select a widget from the widget configuration")
                    .font(.caption)
                    .multilineTextAlignment(.center)
                    .padding()
            }
        }
    }
    
    // Helper to format the value with prefix and suffix
    private func formatValue(_ value: String, prefix: String?, suffix: String?) -> String {
        var formatted = value
        
        if let prefix = prefix {
            formatted = prefix + formatted
        }
        
        if let suffix = suffix {
            formatted = formatted + suffix
        }
        
        return formatted
    }
    
    // Helper to format date
    private func formattedDate(timeInterval: TimeInterval) -> String {
        let date = Date(timeIntervalSince1970: timeInterval / 1000) // Assuming milliseconds
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .abbreviated
        return formatter.localizedString(for: date, relativeTo: Date())
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
