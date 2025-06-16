import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import {
  getDevice,
  getLanguage,
  getOs,
  getOsVersion,
  getRegion,
  getTimeZone,
  getVersion,
} from "./device";
import { logNewUser } from "./logsnag";
import { supabase } from "./supabase";

// Key for storing the first launch flag
const FIRST_LAUNCH_KEY = "is_first_launch";

/**
 * Checks if this is the first time the user has launched the app
 * @returns Promise<string | null> - id string if this is the first launch, null otherwise
 */
export const isNewUser = async (): Promise<string | null> => {
  try {
    // Try to get the first launch flag
    const value = await AsyncStorage.getItem(FIRST_LAUNCH_KEY);

    // If the flag doesn't exist, this is the first launch
    if (value === null) {
      // Set the flag to indicate the app has been launched
      await AsyncStorage.setItem(FIRST_LAUNCH_KEY, "false");
      const userId = Crypto.randomUUID();
      await AsyncStorage.setItem("userId", userId);
      return userId;
    }

    // If the flag exists, this is not the first launch
    return null;
  } catch (error) {
    console.error("Error checking if user is new:", error);
    // In case of error, return false to be safe
    return null;
  }
};

/**
 * Resets the first launch flag (useful for testing)
 * @returns Promise<void>
 */
export const resetNewUserFlag = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(FIRST_LAUNCH_KEY);
  } catch (error) {
    console.error("Error resetting new user flag:", error);
  }
};

export const userMetadata = {
  version: getVersion(),
  os: getOs(),
  os_version: getOsVersion(),
  device: getDevice() || "",
  language: getLanguage(),
  region: getRegion() || "",
  timezone: getTimeZone() || "",
};

export const createUser = async () => {
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) {
    console.error("Error signing in anonymously:", error);
    return;
  }
  const userId = data.user?.id;
  if (!userId) {
    console.error("No user ID found");
    return;
  }
  await supabase
    .from("users")
    .insert({
      id: userId,
      ...userMetadata,
    })
    .select()
    .single();
  if (error) {
    console.error("Error creating user:", error);
  }

  logNewUser(userId);
};

export const updateLastActivity = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    console.error("No user found");
    return;
  }
  const userId = user.id;
  await supabase
    .from("users")
    .update({
      last_active_at: new Date().toISOString(),
      ...userMetadata,
    })
    .eq("id", userId);
};

export const updateWidgetCount = async (count: number) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    console.error("No user found");
    return;
  }
  const userId = user.id;

  await supabase
    .from("users")
    .update({
      widget_count: count,
      last_active_at: new Date().toISOString(),
    })
    .eq("id", userId);
};
