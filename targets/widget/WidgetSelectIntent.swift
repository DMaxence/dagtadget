import WidgetKit
import AppIntents
import SwiftUI

// Define custom widget type that can be selected
struct WidgetOption: AppEntity {
    let id: String
    let name: String
    
    static var defaultQuery = WidgetQuery()
    static var typeDisplayRepresentation: TypeDisplayRepresentation = "Widget"
    
    var displayRepresentation: DisplayRepresentation {
        DisplayRepresentation(title: LocalizedStringResource(stringLiteral: name))
    }
}

// Query to fetch available widgets
struct WidgetQuery: EntityStringQuery {
    func entities(for identifiers: [String]) async throws -> [WidgetOption] {
        let widgets = getWidgetsFromSharedContainer()
        return widgets.filter { identifiers.contains($0.id) }
    }
    
    func suggestedEntities() async throws -> [WidgetOption] {
        return getWidgetsFromSharedContainer()
    }

    func entities(matching string: String) async throws -> [WidgetOption] {
        let allWidgets = getWidgetsFromSharedContainer()
        if string.isEmpty {
            // Return all or suggested entities if the search string is empty
            return allWidgets 
        }
        return allWidgets.filter { $0.name.localizedCaseInsensitiveContains(string) }
    }
    
    // Helper function to get available widgets from shared container
    private func getWidgetsFromSharedContainer() -> [WidgetOption] {
        guard let groupDefaults = UserDefaults(suiteName: "group.com.datadget") else {
            return []
        }

        // Get all keys in the UserDefaults and find widgets
        let allKeys = groupDefaults.dictionaryRepresentation().keys
        
        return allKeys.compactMap { key in
            // Try to parse as JSON to extract widget name
            if let data = groupDefaults.data(forKey: key),
               let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               let name = json["name"] as? String {
                return WidgetOption(id: key, name: name)
            }
            return nil
        }
    }
}

// Enhanced widget configuration intent with widget selection
struct EnhancedWidgetConfigIntent: WidgetConfigurationIntent {
    static var title: LocalizedStringResource { "Widget Selection" }
    static var description: IntentDescription { "Choose which widget to display" }

    // Widget selection parameter
    @Parameter(title: "Select Widget", description: "Choose which widget to display")
    var selectedWidget: WidgetOption?
}