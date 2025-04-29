import * as Localization from "expo-localization";
import { observable } from "@legendapp/state";

// Define our supported languages
export type SupportedLanguage = "en";

// Replace the explicit type definition with a more generic approach
export type TranslationKeyPath = string;

// Create a type that represents a valid path into the translations object
export type TranslationKey = string;

// Translation dictionaries
const translations: Record<
  SupportedLanguage,
  Record<TranslationKey, string>
> = {
  en: {
    "common.cancel": "Cancel",
    "common.save": "Save",
    "common.saving": "Saving...",
    "common.create": "Create",
    "common.edit": "Edit",
    "common.delete": "Delete",
    "common.preview": "Preview",
    "common.never": "Never",
    "common.back": "Back",
    "common.searchPlaceholder": "Search widgets...",
    "home.title": "Your Widgets",
    "home.noWidgets": "No widgets yet. Create your first widget!",
    "home.addWidget": "Add Widget",
    "widget.create.title": "Create Widget",
    "widget.create.name": "Name",
    "widget.create.nameLabel": "Widget Name",
    "widget.create.namePlaceholder": "My awesome widget",
    "widget.create.prefix": "Prefix",
    "widget.create.prefixLabel": "Prefix (optional)",
    "widget.create.prefixPlaceholder": "$",
    "widget.create.suffix": "Suffix",
    "widget.create.suffixLabel": "Suffix (optional)",
    "widget.create.suffixPlaceholder": "USD",
    "widget.create.dataSource": "Data Source",
    "widget.create.dataSourceLabel": "API URL",
    "widget.create.dataSourcePlaceholder": "https://api.example.com/data",
    "widget.create.refreshInterval": "Refresh Interval",
    "widget.create.refreshIntervalLabel": "Refresh Every",
    "widget.create.colorLabel": "Color",
    "widget.list.title": "Your Widgets",
    "widget.preview.title": "Widget Preview",
  },
};

// Get the best matching language, defaulting to 'en'
const getBestLanguage = (): SupportedLanguage => {
  const locale = Localization.getLocales()[0]?.languageCode;
  return locale && locale in translations
    ? (locale as SupportedLanguage)
    : "en";
};

export const currentLanguage = observable(getBestLanguage());

// Translation function
export const t = (key: TranslationKey): string => {
  const lang = currentLanguage.get() as SupportedLanguage;
  return translations[lang][key] || key;
};
