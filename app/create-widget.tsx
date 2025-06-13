import { router, Stack } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import { TouchableOpacity } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { WidgetForm } from "@/components/WidgetForm";
import { t } from "@/constants/i18n";
import { mixpanel } from "@/utils/mixpanel";
import { trackEvent } from "@aptabase/react-native";
import { usePostHog } from "posthog-react-native";

export default function CreateWidgetScreen() {
  const posthog = usePostHog();
  const [isSaving, setIsSaving] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);
  const timeEnteredScreen = useRef(new Date().getTime());

  const handleFormState = useCallback((saving: boolean, valid: boolean) => {
    setIsSaving(saving);
    setIsFormValid(valid);

    if (saving && !__DEV__) {
      const msToCreateWidget = new Date().getTime() - timeEnteredScreen.current;
      const minutes = Math.floor(msToCreateWidget / 60000);
      const seconds = Math.floor((msToCreateWidget % 60000) / 1000);
      const timeToCreateWidget = `${minutes}:${seconds
        .toString()
        .padStart(2, "0")}`;

      posthog.capture("widget_created", {
        msToCreateWidget,
        timeToCreateWidget,
      });
      trackEvent("widget_created", { msToCreateWidget, timeToCreateWidget });
      mixpanel.track("widget_created", {
        msToCreateWidget,
        timeToCreateWidget,
      });
    }
  }, []);

  // Create a reference to the WidgetForm's save function
  const formRef = React.useRef<any>(null);

  return (
    <>
      <Stack.Screen
        options={{
          title: t("widget.create.title"),
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <ThemedText>{t("common.cancel")}</ThemedText>
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity
              onPress={() => formRef.current?.handleSave()}
              disabled={!isFormValid || isSaving}
            >
              <ThemedText
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  opacity: !isFormValid || isSaving ? 0.5 : 1,
                }}
              >
                {isSaving ? t("common.saving") : t("common.create")}
              </ThemedText>
            </TouchableOpacity>
          ),
        }}
      />
      <WidgetForm mode="create" ref={formRef} onSave={handleFormState} />
    </>
  );
}
