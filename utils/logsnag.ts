import { LogSnag } from "logsnag";
import { userMetadata } from "./userUtils";

export const logsnag = new LogSnag({
  token: process.env.EXPO_PUBLIC_LOGSNAG_TOKEN || "",
  project: process.env.EXPO_PUBLIC_LOGSNAG_PROJECT || "",
});

export const logNewUser = (userId: string) => {
  logsnag.track({
    channel: "users",
    event: "New user",
    user_id: userId,
    icon: "👋",
    notify: true,
    tags: {
      time: new Date().toISOString(),
      ...userMetadata,
    },
  });
};
