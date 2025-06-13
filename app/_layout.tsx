import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import * as Linking from "expo-linking";
import { router, Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { PropsWithChildren, useEffect } from "react";
import "react-native-reanimated";

import { t } from "@/constants/i18n";
import { useColorScheme } from "@/hooks/useColorScheme";
import { registerBackgroundTask } from "@/services/backgroundTask";
import { widgetActions } from "@/state/widget";
import { mixpanel } from "@/utils/mixpanel";
import { supabase } from "@/utils/supabase";
import { createUser, updateLastActivity } from "@/utils/userUtils";
import Aptabase from "@aptabase/react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  PostHogProvider as OriginalPostHogProvider,
  usePostHog,
} from "posthog-react-native";
import { TouchableOpacity } from "react-native";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

mixpanel.init();

Aptabase.init(process.env.EXPO_PUBLIC_APTABASE_APP_KEY || "");

// Bugsnag.start({
//   enabledReleaseStages: ["production"],
//   releaseStage: __DEV__ ? "local" : "production",
// });

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
  const posthog = usePostHog();
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  const checkSession = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const userId = user?.id;
    if (!userId) {
      createUser();
    } else {
      updateLastActivity();
    }
  };

  useEffect(() => {
    if (loaded) {
      checkSession();

      widgetActions.scheduleRefreshes();

      // Register background task for widget updates
      registerBackgroundTask();

      // Hide splash screen
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  // Handle initial URL for cold app launches from deep links
  useEffect(() => {
    let hasHandledInitialURL = false;

    const handleInitialURL = async () => {
      try {
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl && !hasHandledInitialURL) {
          hasHandledInitialURL = true;
          router.replace("/");
          const parsedUrl = Linking.parse(initialUrl);

          // Construct the correct path for routing
          let routePath = parsedUrl.path;

          // Handle widget URLs: datadget://widget/{id} -> /widget/{id}
          if (parsedUrl.hostname === "widget") {
            routePath = `/widget/${parsedUrl.path || ""}`;
          }

          if (routePath) {
            if (router.canGoBack()) {
              router.replace(routePath as any);
            } else {
              router.push(routePath as any);
            }
          }
        }
      } catch (error) {
        console.error("Error handling initial URL:", error);
      }
    };

    if (loaded) {
      handleInitialURL();
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
              headerRight: () => (
                <TouchableOpacity
                  onPress={() => router.push("/create-widget")}
                  style={{
                    alignItems: "center",
                    justifyContent: "center",
                    width: 40,
                    height: 40,
                  }}
                >
                  <Ionicons
                    name="add-circle-outline"
                    size={28}
                    color={colorScheme === "dark" ? "white" : "black"}
                    style={{
                      padding: 4,
                    }}
                  />
                </TouchableOpacity>
              ),
            }}
          />
          <Stack.Screen
            name="create-widget"
            options={{
              headerShown: true,
              headerBackTitle: t("common.cancel"),
              presentation: "modal",
            }}
          />
          <Stack.Screen
            name="widget/[id]"
            options={{
              headerShown: true,
              headerBackTitle: t("common.back"),
            }}
          />
          <Stack.Screen
            name="edit-widget/[id]"
            options={{
              headerShown: true,
              headerBackTitle: t("common.cancel"),
              presentation: "modal",
            }}
          />
          <Stack.Screen name="+not-found" />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </PostHogProvider>
  );
}
