import { Mixpanel } from "mixpanel-react-native";

export const mixpanel = new Mixpanel(
  process.env.EXPO_PUBLIC_MIXPANEL_TOKEN || "",
  true
);
