import React, { useEffect, useState, useCallback, useRef } from 'react';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useObservable } from '@legendapp/state/react';
import { TouchableOpacity } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { t } from '@/constants/i18n';
import { widgetState } from '@/state/widget';
import { Widget } from '@/types/widget';
import { WidgetForm, WidgetFormHandles } from '@/components/WidgetForm';

export default function EditWidgetScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const widget = useObservable(widgetState.widgets[id ?? '']);
  const [initialValues, setInitialValues] = useState<Widget | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);
  
  // Create a reference to the WidgetForm's save function
  const formRef = useRef<WidgetFormHandles>(null);
  
  const handleFormState = useCallback((saving: boolean, valid: boolean) => {
    setIsSaving(saving);
    setIsFormValid(valid);
  }, []);
  
  // Load widget data
  useEffect(() => {
    if (widget.peek() && id) {
      const widgetData = widget.peek() as Widget;
      setInitialValues(widgetData);
    } else if (id) {
      // Widget not found, go back to home
      router.replace('/');
    }
  }, [id]);

  if (!initialValues || !id) {
    return (
      <ThemedView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ThemedText>Loading...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <>
      <Stack.Screen 
        options={{ 
          title: initialValues.name || t('widget.create.title'),
          headerRight: () => (
            <TouchableOpacity 
              onPress={() => formRef.current?.handleSave()}
              disabled={!isFormValid || isSaving}
            >
              <ThemedText 
                style={{ 
                  fontSize: 16, 
                  fontWeight: '600',
                  opacity: (!isFormValid || isSaving) ? 0.5 : 1,
                }}
              >
                {isSaving ? t("common.saving") : t("common.save")}
              </ThemedText>
            </TouchableOpacity>
          ),
        }} 
      />
      <WidgetForm 
        mode="edit" 
        widgetId={id}
        ref={formRef}
        onSave={handleFormState}
        initialValues={{
          name: initialValues.name,
          prefix: initialValues.prefix || '',
          suffix: initialValues.suffix || '',
          dataSourceUrl: initialValues.dataSource.url,
          jsonPath: initialValues.dataSource.jsonPath || '',
          refreshInterval: initialValues.refreshInterval,
          color: initialValues.color || '',
          headers: initialValues.dataSource.headers || [],
        }}
      />
    </>
  );
} 