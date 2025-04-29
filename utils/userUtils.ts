import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";

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
      return Crypto.randomUUID();
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
