import { router, Stack } from "expo-router";
import React, { useCallback, useState } from "react";
import { TouchableOpacity } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { WidgetForm } from "@/components/WidgetForm";
import { t } from "@/constants/i18n";

export default function CreateWidgetScreen() {
  const [isSaving, setIsSaving] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);

  const handleFormState = useCallback((saving: boolean, valid: boolean) => {
    setIsSaving(saving);
    setIsFormValid(valid);
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
