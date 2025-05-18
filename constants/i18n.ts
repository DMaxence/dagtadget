import * as Localization from "expo-localization";
import { observable } from "@legendapp/state";

// Define our supported languages
export type SupportedLanguage = "en" | "fr";

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
  fr: { // Placeholder French translations - REPLACE these with actual translations
    "common.cancel": "Annuler", // Annuler
    "common.save": "Enregistrer", // Enregistrer
    "common.saving": "Enregistrement...", // Enregistrement...
    "common.create": "Créer", // Créer
    "common.edit": "Modifier", // Modifier
    "common.delete": "Supprimer", // Supprimer
    "common.preview": "Aperçu", // Aperçu
    "common.never": "Jamais", // Jamais
    "common.back": "Retour", // Retour
    "common.searchPlaceholder": "Rechercher des widgets...", // Rechercher des widgets...
    "home.title": "Vos Widgets", // Vos Widgets
    "home.noWidgets": "Aucun widget pour l'instant. Créez votre premier widget !", // Aucun widget pour l'instant. Créez votre premier widget !
    "home.addWidget": "Ajouter un Widget", // Ajouter un Widget
    "widget.create.title": "Créer un Widget", // Créer un Widget
    "widget.create.name": "Nom", // Nom
    "widget.create.nameLabel": "Nom du Widget", // Nom du Widget
    "widget.create.namePlaceholder": "Mon super widget", // Mon super widget
    "widget.create.prefix": "Préfixe", // Préfixe
    "widget.create.prefixLabel": "Préfixe (optionnel)", // Préfixe (optionnel)
    "widget.create.prefixPlaceholder": "$",
    "widget.create.suffix": "Suffixe", // Suffixe
    "widget.create.suffixLabel": "Suffixe (optionnel)", // Suffixe (optionnel)
    "widget.create.suffixPlaceholder": "USD",
    "widget.create.dataSource": "Source de Données", // Source de Données
    "widget.create.dataSourceLabel": "URL de l'API", // URL de l'API
    "widget.create.dataSourcePlaceholder": "https://api.example.com/data",
    "widget.create.refreshInterval": "Intervalle de Rafraîchissement", // Intervalle de Rafraîchissement
    "widget.create.refreshIntervalLabel": "Rafraîchir Toutes Les", // Rafraîchir Toutes Les
    "widget.create.colorLabel": "Couleur", // Couleur
    "widget.list.title": "Vos Widgets", // Vos Widgets
    "widget.preview.title": "Aperçu du Widget", // Aperçu du Widget
  },
};

// Get the best matching language, defaulting to 'en'
const getBestLanguage = (): SupportedLanguage => {
  const locale = Localization.getLocales()[0]?.languageCode;
  if (locale === "fr") {
    return "fr";
  }
  return "en"; // Default to English for any other language
};

export const currentLanguage = observable(getBestLanguage());

// Translation function
export const t = (key: TranslationKey): string => {
  const lang = currentLanguage.get() as SupportedLanguage;
  return translations[lang][key] || key;
};
