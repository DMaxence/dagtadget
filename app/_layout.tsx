import Bugsnag from "@bugsnag/expo";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { router, Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { LogSnag } from "logsnag";
import { PropsWithChildren, useEffect } from "react";
import "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { t } from "@/constants/i18n";
import { useColorScheme } from "@/hooks/useColorScheme";
import { loadWidgetsFromStorage, widgetActions } from "@/state/widget";
import {
  getDevice,
  getLanguage,
  getOs,
  getRegion,
  getTimeZone,
  getVersion,
} from "@/utils/device";
import { isNewUser, resetNewUserFlag } from "@/utils/userUtils";
import { Ionicons } from "@expo/vector-icons";
import { TouchableOpacity } from "react-native";
import { PostHogProvider as OriginalPostHogProvider } from "posthog-react-native";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

Bugsnag.start({
  enabledReleaseStages: ["production"],
  releaseStage: __DEV__ ? "local" : "production",
});

const PostHogProvider = ({ children }: PropsWithChildren) => {
  return __DEV__ ? (
    <>{children}</>
  ) : (
    <OriginalPostHogProvider
      apiKey={process.env.EXPO_PUBLIC_POSTHOG_API_KEY}
      options={{ host: process.env.EXPO_PUBLIC_POSTHOG_HOST }}
    >
      {children}
    </OriginalPostHogProvider>
  );
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  useEffect(() => {
    if (loaded) {
      // Check if user is new and load stored widgets
      Promise.all([
        isNewUser().then((userId) => {
          if (userId) {
            const logsnag = new LogSnag({
              token: process.env.EXPO_PUBLIC_LOGSNAG_TOKEN || "",
              project: process.env.EXPO_PUBLIC_LOGSNAG_PROJECT || "",
            });
            logsnag.track({
              channel: "users",
              event: "New user",
              user_id: userId,
              icon: "👋",
              notify: true,
              tags: {
                time: new Date().toISOString(),
                version: getVersion(),
                os: getOs(),
                device: getDevice() || "",
                language: getLanguage(),
                region: getRegion() || "",
                timezone: getTimeZone() || "",
              },
            });
          }
        }),
        loadWidgetsFromStorage(),
      ]).then(() => {
        // Schedule widget refreshes
        widgetActions.scheduleRefreshes();
        // Hide splash screen
        SplashScreen.hideAsync();
      });
      Bugsnag.notify(new Error("Test error"));
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <PostHogProvider>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <Stack>
          {/* <Stack.Screen name="(tabs)" options={{ headerShown: false }} /> */}
          <Stack.Screen
            name="index"
            options={{
              headerShown: true,
              headerLargeTitle: true,
              headerTransparent: true,
              headerBlurEffect:
                colorScheme === "dark"
                  ? "systemUltraThinMaterialDark"
                  : "systemUltraThinMaterialLight",
              headerSearchBarOptions: {
                placeholder: t("common.searchPlaceholder"),
                tintColor: colorScheme === "dark" ? "white" : "black",
                onChangeText: (event) =>
                  router.setParams({ searchText: event.nativeEvent.text }),
                hideWhenScrolling: true,
              },
              title: t("home.title"),
              contentStyle: { paddingTop: 0 },
              headerLeft: () => (
                <TouchableOpacity onPress={resetNewUserFlag}>
                  <ThemedText>Reset new user flag</ThemedText>
                </TouchableOpacity>
              ),
              headerRight: () => (
                <TouchableOpacity onPress={() => router.push("/create-widget")}>
                  <Ionicons
                    name="add-circle-outline"
                    size={28}
                    color={colorScheme === "dark" ? "white" : "black"}
                  />
                </TouchableOpacity>
              ),
            }}
          />
          <Stack.Screen
            name="create-widget"
            options={{ headerShown: true, headerBackTitle: t("common.cancel") }}
          />
          <Stack.Screen
            name="edit-widget/[id]"
            options={{ headerShown: true, headerBackTitle: t("common.cancel") }}
          />
          <Stack.Screen name="+not-found" />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </PostHogProvider>
  );
}
