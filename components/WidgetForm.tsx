import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { router } from "expo-router";
import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  Switch,
} from "react-native";

import { ColorSelector } from "@/components/ColorSelector";
import { JsonPathSelector } from "@/components/JsonPathSelector";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { t } from "@/constants/i18n";
import { useThemeColor } from "@/hooks/useThemeColor";
import { widgetActions } from "@/state/widget";
import { HeaderPair, WidgetRefreshInterval } from "@/types/widget";
import { parseJsonPath } from "@/utils/jsonPath";
import { IconSelector } from "@/components/IconSelector";

// Default colors from widget item
const DEFAULT_COLOR = "#34aadc"; // blue

interface WidgetFormProps {
  mode: "create" | "edit";
  widgetId?: string;
  initialValues?: {
    name: string;
    prefix: string;
    suffix: string;
    dataSourceUrl: string;
    jsonPath: string;
    headers: HeaderPair[];
    refreshInterval: WidgetRefreshInterval;
    color: string;
    value?: string;
    icon?: string;
  };
  onDelete?: () => Promise<void>;
  onSave?: (isSaving: boolean, isValid: boolean) => void;
}

export interface WidgetFormHandles {
  handleSave: () => Promise<void>;
  handleCancel: () => void;
}

export const WidgetForm = forwardRef<WidgetFormHandles, WidgetFormProps>(
  ({ mode, widgetId, initialValues, onDelete, onSave }, ref) => {
    const [name, setName] = useState(initialValues?.name || "");
    const [prefix, setPrefix] = useState(initialValues?.prefix || "");
    const [suffix, setSuffix] = useState(initialValues?.suffix || "");
    const [dataSourceUrl, setDataSourceUrl] = useState(
      initialValues?.dataSourceUrl || ""
    );
    const [jsonPath, setJsonPath] = useState(initialValues?.jsonPath || "");
    const [headers, setHeaders] = useState<HeaderPair[]>(
      initialValues?.headers || []
    );
    const [color, setColor] = useState(initialValues?.color || DEFAULT_COLOR);
    const [icon, setIcon] = useState(initialValues?.icon || "star");
    const [refreshInterval, setRefreshInterval] =
      useState<WidgetRefreshInterval>(
        initialValues?.refreshInterval || WidgetRefreshInterval.HOUR_1
      );
    const [previewValue, setPreviewValue] = useState<string | null>(null);
    const [isLoadingPreview, setIsLoadingPreview] = useState(false);
    const [apiResponseData, setApiResponseData] = useState<any>(null);
    const [isLoadingApiData, setIsLoadingApiData] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    // Timer ref for debounced fetch
    const fetchTimerRef = useRef<NodeJS.Timeout | null>(null);

    const backgroundColor = useThemeColor(
      { light: "#ffffff", dark: "#121212" },
      "background"
    );
    const inputBackgroundColor = useThemeColor(
      { light: "#f8f8f8", dark: "#2a2a2a" },
      "background"
    );
    const cardBackgroundColor = useThemeColor(
      { light: "#ffffff", dark: "#2a2a2a" },
      "background"
    );
    const previewBackgroundColor = useThemeColor(
      { light: "#f0f7ff", dark: "#1a2c3f" },
      "background"
    );
    const borderColor = useThemeColor(
      { light: "#e0e0e0", dark: "#3a3a3a" },
      "background"
    );
    const accentColor = useThemeColor(
      { light: "#0070f3", dark: "#3694ff" },
      "tint"
    );
    const deleteColor = useThemeColor(
      { light: "#ff3b30", dark: "#ff453a" },
      "text"
    );
    const placeholderColor = useThemeColor(
      { light: "#a0a0a0", dark: "#707070" },
      "text"
    );
    const labelColor = useThemeColor(
      { light: "#505050", dark: "#b0b0b0" },
      "text"
    );
    const textColor = useThemeColor(
      { light: "#303030", dark: "#e0e0e0" },
      "text"
    );
    const valueColor = useThemeColor(
      { light: "#0070f3", dark: "#3694ff" },
      "tint"
    );

    const isFormValid = name.trim() !== "" && dataSourceUrl.trim() !== "";

    // Notify parent component about form validity state
    useEffect(() => {
      onSave?.(isSaving, isFormValid);
    }, [isSaving, isFormValid]);

    // Load preview data for edit mode
    useEffect(() => {
      if (mode === "edit" && widgetId) {
        fetchPreview();
      }
    }, []);

    // Automatically fetch API data when URL changes
    useEffect(() => {
      if (dataSourceUrl && dataSourceUrl.trim() !== "") {
        // Debounce the fetch to avoid making too many requests
        if (fetchTimerRef.current) {
          clearTimeout(fetchTimerRef.current);
        }

        fetchTimerRef.current = setTimeout(() => {
          if (isValidUrl(dataSourceUrl)) {
            fetchApiData();
          }
        }, 800); // Wait 800ms after typing stops
      }

      return () => {
        if (fetchTimerRef.current) {
          clearTimeout(fetchTimerRef.current);
        }
      };
    }, [dataSourceUrl, headers]);

    // Function to validate URL
    const isValidUrl = (url: string): boolean => {
      try {
        new URL(url);
        return true;
      } catch (e) {
        return false;
      }
    };

    const fetchApiData = async () => {
      if (!dataSourceUrl) return;

      setIsLoadingApiData(true);
      try {
        // Convert headers array to object format for fetch
        const headerObj = headers.reduce((acc, { key, value }) => {
          if (key.trim() !== "") {
            acc[key] = value;
          }
          return acc;
        }, {} as Record<string, string>);

        const response = await fetch(dataSourceUrl, {
          method: "GET",
          headers: headerObj,
        });

        if (!response.ok) {
          throw new Error(`Error fetching data: ${response.statusText}`);
        }

        const data = await response.json();
        setApiResponseData(data);

        // If there's a jsonPath already, extract the preview value
        updatePreviewFromPath(data, jsonPath);
      } catch (error) {
        console.error("Error fetching API data:", error);
        setApiResponseData(null);
      } finally {
        setIsLoadingApiData(false);
      }
    };

    const updatePreviewFromPath = (data: any, path: string) => {
      if (!data) return;

      try {
        const value = path ? parseJsonPath(data, path) : data;
        setPreviewValue(
          value !== null && value !== undefined ? String(value) : t("dataSelection.noData")
        );
      } catch (error) {
        console.error("Error extracting value:", error);
        setPreviewValue(t("analytics.error", { error: "extraction failed" }));
      }
    };

    const fetchPreview = async () => {
      if (!dataSourceUrl) return;

      setIsLoadingPreview(true);
      try {
        // Convert headers array to object format for fetch
        const headerObj = headers.reduce((acc, { key, value }) => {
          if (key.trim() !== "") {
            acc[key] = value;
          }
          return acc;
        }, {} as Record<string, string>);

        const response = await fetch(dataSourceUrl, {
          method: "GET",
          headers: headerObj,
        });

        if (!response.ok) {
          throw new Error(`Error fetching data: ${response.statusText}`);
        }

        const data = await response.json();

        // Save the full response data for the selector
        setApiResponseData(data);

        // Extract the value using the jsonPath utility
        updatePreviewFromPath(data, jsonPath);
      } catch (error) {
        console.error("Error fetching preview:", error);
        setPreviewValue("Error");
      } finally {
        setIsLoadingPreview(false);
      }
    };

    const handleCancel = () => {
      router.back();
    };

    const handleSave = async () => {
      if (!name || !dataSourceUrl) return;

      setIsSaving(true);
      setErrorMessage("");

      try {
        if (mode === "create") {
          // Create the widget
          const newWidgetId = widgetActions.createWidget({
            name,
            prefix,
            suffix,
            color,
            dataSource: {
              url: dataSourceUrl,
              jsonPath: jsonPath || undefined,
              headers:
                headers.filter((h) => h.key.trim() !== "").length > 0
                  ? headers
                  : undefined,
            },
            refreshInterval,
            icon,
          });

          // Fetch initial data
          await widgetActions.fetchWidgetData(newWidgetId);
        } else if (mode === "edit" && widgetId) {
          // Update the widget
          widgetActions.updateWidget(widgetId, {
            name,
            prefix,
            suffix,
            color,
            dataSource: {
              url: dataSourceUrl,
              jsonPath: jsonPath || undefined,
              headers:
                headers.filter((h) => h.key.trim() !== "").length > 0
                  ? headers
                  : undefined,
            },
            refreshInterval,
            icon,
          });

          // Fetch updated data
          await widgetActions.fetchWidgetData(widgetId);
        }

        // Update the refresh schedules
        widgetActions.scheduleRefreshes();

        // Navigate back
        router.dismiss();
      } catch (error) {
        console.error(
          `Error ${mode === "create" ? "creating" : "updating"} widget:`,
          error
        );
        setErrorMessage(t("widget.create.errorSaving"));
      } finally {
        setIsSaving(false);
      }
    };

    const handleDelete = async () => {
      if (!widgetId) return;

      Alert.alert(
        t("delete.widget.title"),
        t("delete.widget.message"),
        [
          {
            text: t("common.cancel"),
            style: "cancel",
          },
          {
            text: t("common.delete"),
            style: "destructive",
            onPress: async () => {
              setIsDeleting(true);
              try {
                await onDelete?.();
                widgetActions.deleteWidget(widgetId);
                router.dismissAll();
              } catch (error) {
                console.error("Error deleting widget:", error);
                setErrorMessage(t("widget.create.errorDeleting"));
              } finally {
                setIsDeleting(false);
              }
            },
          },
        ]
      );
    };

    const handlePathSelect = (path: string) => {
      setJsonPath(path);
      updatePreviewFromPath(apiResponseData, path);
    };

    // Function to add a new header pair
    const addHeader = () => {
      setHeaders([...headers, { id: randomId(), key: "", value: "" }]);
    };

    // Function to update a header key or value
    const updateHeader = (id: string, field: "key" | "value", text: string) => {
      setHeaders(
        headers.map((header) =>
          header.id === id ? { ...header, [field]: text } : header
        )
      );
    };

    // Function to remove a header
    const removeHeader = (id: string) => {
      setHeaders(headers.filter((header) => header.id !== id));
    };

    // Generate a random ID for headers
    const randomId = () => Math.random().toString(36).substring(2, 9);

    // Updated form field renderer to match design in image
    const renderFormField = (
      label: string,
      value: string,
      onChangeText: (text: string) => void,
      placeholder: string,
      keyboardType?: "default" | "url",
      autoCapitalize?: "none" | "sentences",
      icon?: keyof typeof Ionicons.glyphMap
    ) => (
      <View style={styles.formGroup}>
        <View style={styles.formFieldHeader}>
          {icon && (
            <View style={[styles.formFieldIcon, { backgroundColor: '#ff9500' }]}>
              <Ionicons name={icon as any} size={20} color="#ffffff" />
            </View>
          )}
          <ThemedText style={[styles.label, { color: textColor }]}>{label}</ThemedText>
        </View>
        <View style={styles.inputWrapper}>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: inputBackgroundColor,
                borderColor: 'transparent',
                color: textColor,
              },
            ]}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={placeholderColor}
            keyboardType={keyboardType || "default"}
            autoCapitalize={autoCapitalize || "sentences"}
          />
        </View>
      </View>
    );

    const renderDataSourceField = () => (
      <View style={styles.formGroup}>
        <ThemedText style={[styles.label, { color: labelColor }]}>
          {t("widget.create.dataSourceLabel")}
        </ThemedText>
        <View style={styles.inputWrapper}>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: inputBackgroundColor,
                borderColor,
                color: textColor,
              },
            ]}
            value={dataSourceUrl}
            onChangeText={setDataSourceUrl}
            placeholder={t("widget.create.dataSourcePlaceholder")}
            placeholderTextColor={placeholderColor}
            keyboardType="url"
            autoCapitalize="none"
          />
        </View>
        {isLoadingApiData && (
          <View style={styles.loadingIndicator}>
            <ActivityIndicator size="small" color={accentColor} />
            <ThemedText style={styles.loadingText}>{t("loading.fetchingData")}</ThemedText>
          </View>
        )}

        <View style={styles.headerSection}>
          <View style={styles.headerTitleRow}>
            <ThemedText
              style={[styles.label, { color: labelColor, marginBottom: 0 }]}
            >
              {t("headers.title")}
            </ThemedText>
            <TouchableOpacity
              style={[styles.addHeaderButton, { backgroundColor: accentColor }]}
              onPress={addHeader}
            >
              <Ionicons name="add" size={16} color="#fff" />
            </TouchableOpacity>
          </View>

          {headers.length === 0 && (
            <ThemedText style={styles.noHeadersText}>
              {t("headers.noHeaders")}
            </ThemedText>
          )}

          {headers.map((header) => (
            <View key={header.id} style={styles.headerRow}>
              <TextInput
                style={[
                  styles.headerKeyInput,
                  {
                    backgroundColor: inputBackgroundColor,
                    borderColor,
                    color: textColor,
                  },
                ]}
                value={header.key}
                onChangeText={(text) => updateHeader(header.id, "key", text)}
                placeholder={t("headers.key")}
                placeholderTextColor={placeholderColor}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <ThemedText style={styles.headerColon}>:</ThemedText>
              <TextInput
                style={[
                  styles.headerValueInput,
                  {
                    backgroundColor: inputBackgroundColor,
                    borderColor,
                    color: textColor,
                  },
                ]}
                value={header.value}
                onChangeText={(text) => updateHeader(header.id, "value", text)}
                placeholder={t("headers.value")}
                placeholderTextColor={placeholderColor}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={styles.removeHeaderButton}
                onPress={() => removeHeader(header.id)}
              >
                <Ionicons name="close-circle" size={20} color={deleteColor} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </View>
    );

    const renderJsonPathSelector = () => (
      <View style={styles.formGroup}>
        <ThemedText style={[styles.label, { color: labelColor }]}>
          {t("dataSelection.title")}
        </ThemedText>
        <ThemedText style={styles.helpText}>
          {t("dataSelection.helpText")}
        </ThemedText>

        <JsonPathSelector
          data={apiResponseData}
          currentPath={jsonPath}
          onPathSelect={handlePathSelect}
          isLoading={isLoadingApiData}
        />
      </View>
    );

    const renderWidgetPreview = () => (
      <View style={styles.previewContainer}>
        <ThemedView
          style={[
            styles.previewCard,
            {
              backgroundColor: color || DEFAULT_COLOR,
              borderColor: "transparent",
            },
          ]}
        >
          <View style={styles.widgetContent}>
            <ThemedText style={styles.previewTitle}>
              {name || t("widgetPreview.title")}
            </ThemedText>
          </View>

          <View style={styles.valueContainer}>
            {isLoadingPreview ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <ThemedText
                style={styles.previewValue}
                numberOfLines={1}
                adjustsFontSizeToFit={true}
                minimumFontScale={0.7}
              >
                {prefix}
                {previewValue ?? t("widgetPreview.preview")}
                {suffix}
              </ThemedText>
            )}
            <ThemedText style={styles.updatedAt}>
              {dataSourceUrl ? t("widgetPreview.dataSourceConnected") : t("widgetPreview.noDataSource")}
            </ThemedText>
          </View>
        </ThemedView>
      </View>
    );

    // Expose methods to parent via ref
    useImperativeHandle(ref, () => ({
      handleSave,
      handleCancel,
    }));

    return (
      <KeyboardAvoidingView 
        style={[styles.container, { backgroundColor }]}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {renderWidgetPreview()}

          <View style={styles.formContainer}>
            {renderFormField(
              t("widget.create.nameLabel"),
              name,
              setName,
              t("widget.create.namePlaceholder")
            )}

            <ColorSelector selectedColor={color} onSelectColor={setColor} />

            {renderFormField(
              t("widget.create.prefixLabel"),
              prefix,
              setPrefix,
              t("widget.create.prefixPlaceholder")
            )}

            {renderFormField(
              t("widget.create.suffixLabel"),
              suffix,
              setSuffix,
              t("widget.create.suffixPlaceholder")
            )}

            {renderDataSourceField()}

            {apiResponseData && renderJsonPathSelector()}

            <View style={styles.formGroup} >
              <ThemedText style={[styles.label, { color: labelColor }]}>
                {t("widget.create.refreshIntervalLabel")}
              </ThemedText>
              <View
                style={[
                  styles.pickerContainer,
                  { backgroundColor: inputBackgroundColor, borderColor },
                ]}
              >
                <Picker
                  selectedValue={refreshInterval}
                  onValueChange={(itemValue: WidgetRefreshInterval) =>
                    setRefreshInterval(itemValue)
                  }
                  style={styles.picker}
                  dropdownIconColor={textColor}
                  itemStyle={{ color: textColor }}
                >
                  <Picker.Item
                    label={t("refreshInterval.15min")}
                    value={WidgetRefreshInterval.MIN_15}
                  />
                  <Picker.Item
                    label={t("refreshInterval.30min")}
                    value={WidgetRefreshInterval.MIN_30}
                  />
                  <Picker.Item
                    label={t("refreshInterval.1hour")}
                    value={WidgetRefreshInterval.HOUR_1}
                  />
                  <Picker.Item
                    label={t("refreshInterval.4hours")}
                    value={WidgetRefreshInterval.HOUR_4}
                  />
                  <Picker.Item
                    label={t("refreshInterval.6hours")}
                    value={WidgetRefreshInterval.HOUR_6}
                  />
                  <Picker.Item
                    label={t("refreshInterval.12hours")}
                    value={WidgetRefreshInterval.HOUR_12}
                  />
                  <Picker.Item
                    label={t("refreshInterval.1day")}
                    value={WidgetRefreshInterval.DAY_1}
                  />
                  <Picker.Item
                    label={t("refreshInterval.2days")}
                    value={WidgetRefreshInterval.DAY_2}
                  />
                </Picker>
              </View>
            </View>
          </View>

          {mode === "edit" && (
            <TouchableOpacity
              style={[styles.deleteButton, { borderColor: deleteColor }]}
              onPress={handleDelete}
              activeOpacity={0.7}
            >
              <ThemedText
                style={[styles.deleteButtonText, { color: deleteColor }]}
              >
                {t("common.delete")}
              </ThemedText>
            </TouchableOpacity>
          )}

          {errorMessage && (
            <ThemedText style={styles.errorText}>{errorMessage}</ThemedText>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  formContainer: {
    marginTop: 20,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  previewContainer: {
    alignItems: "center",
  },
  previewCard: {
    aspectRatio: 1,
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 20,
    minHeight: 180,
    flexDirection: "column",
    justifyContent: "space-between",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  widgetContent: {
    flex: 1,
    padding: 16,
    alignItems: "flex-start",
  },
  previewIcon: {
    marginBottom: 8,
  },
  previewTitle: {
    fontWeight: "bold",
    fontSize: 20,
    marginBottom: 4,
    flexWrap: "wrap",
    color: "#ffffff",
  },
  refreshButton: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  valueContainer: {
    padding: 16,
    paddingTop: 0,
  },
  previewValue: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 8,
    paddingTop: 12,
    color: "#ffffff",
    textAlign: "left",
  },
  updatedAt: {
    fontSize: 12,
    marginTop: 4,
    color: "rgba(255, 255, 255, 0.8)",
  },
  previewFooter: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
    alignItems: "center",
  },
  previewFooterText: {
    fontSize: 12,
    opacity: 0.7,
  },
  formGroup: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: "hidden",
  },
  formFieldHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  formFieldIcon: {
    width: 32,
    height: 32,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  label: {
    fontWeight: "600",
    fontSize: 16,
  },
  helpText: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 8,
  },
  loadingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  loadingText: {
    fontSize: 12,
    marginLeft: 8,
    opacity: 0.7,
  },
  inputWrapper: {
    borderRadius: 12,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  input: {
    height: 52,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  toggleContainer: {
    height: 52,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingHorizontal: 16,
  },
  selectorContainer: {
    height: 52,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  selectorValue: {
    fontSize: 16,
  },
  switch: {
    transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }],
  },
  pathInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  pathInputLabel: {
    fontWeight: "600",
    marginRight: 8,
    fontSize: 14,
    width: 40,
  },
  pathInput: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    borderWidth: 1,
  },
  pickerContainer: {
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  picker: {
    height: 152,
  },
  deleteButton: {
    height: 54,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  deleteButtonText: {
    fontWeight: "600",
    fontSize: 16,
  },
  errorText: {
    color: "red",
    marginBottom: 16,
  },
  headerSection: {
    marginTop: 16,
  },
  headerTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  addHeaderButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  headerKeyInput: {
    flex: 2,
    height: 40,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    borderWidth: 1,
  },
  headerColon: {
    marginHorizontal: 6,
    fontWeight: "bold",
  },
  headerValueInput: {
    flex: 3,
    height: 40,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    borderWidth: 1,
  },
  removeHeaderButton: {
    padding: 8,
  },
  noHeadersText: {
    fontSize: 14,
    fontStyle: "italic",
    opacity: 0.7,
    marginBottom: 8,
  },
});
