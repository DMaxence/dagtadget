import * as Localization from "expo-localization";
import { observable } from "@legendapp/state";
import { enTranslations } from "./translations/en";
import { frTranslations } from "./translations/fr";

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
  en: enTranslations,
  fr: frTranslations,
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

// Translation function with parameter interpolation support
export const t = (key: TranslationKey, params?: Record<string, string | number>): string => {
  const lang = currentLanguage.get() as SupportedLanguage;
  let translation = translations[lang][key] || key;
  
  // If parameters are provided, interpolate them
  if (params) {
    Object.entries(params).forEach(([paramKey, paramValue]) => {
      translation = translation.replace(`{${paramKey}}`, String(paramValue));
    });
  }
  
  return translation;
};
