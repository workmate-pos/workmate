import { useScreen } from '@work-orders/common-pos/hooks/use-screen.js';
import { useEffect, useState } from 'react';
import { useUnsavedChangesDialog } from '@work-orders/common-pos/hooks/use-unsaved-changes-dialog.js';
import { Button, ScrollView, Stack, Text, TextField } from '@shopify/retail-ui-extensions-react';
import { ResponsiveGrid } from '@work-orders/common-pos/components/ResponsiveGrid.js';

export function CustomFieldConfig() {
  const [customFields, setCustomFields] = useState<Record<string, string>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const [newCustomFieldName, setNewCustomFieldName] = useState('');
  const [newCustomFieldNameError, setNewCustomFieldNameError] = useState('');

  const { Screen, closePopup } = useScreen('CustomFieldConfig', ({ customFields }) => {
    setCustomFields(customFields);
    setHasUnsavedChanges(false);

    setNewCustomFieldName('');
    setNewCustomFieldNameError('');
  });

  const unsavedChangesDialog = useUnsavedChangesDialog({ hasUnsavedChanges });

  useEffect(() => {
    if (Object.keys(customFields).includes(newCustomFieldName)) {
      setNewCustomFieldNameError('A custom field with this name already exists');
    } else {
      setNewCustomFieldNameError('');
    }
  }, [newCustomFieldName]);

  function createNewCustomField() {
    if (newCustomFieldName.trim().length === 0) {
      setNewCustomFieldNameError('Custom field name is required');
      return;
    }

    setHasUnsavedChanges(true);
    setNewCustomFieldName('');
    setNewCustomFieldNameError('');
    setCustomFields({
      ...customFields,
      [newCustomFieldName]: '',
    });
  }

  return (
    <Screen title="Custom Fields" overrideNavigateBack={unsavedChangesDialog.show}>
      <ScrollView>
        <Stack direction={'horizontal'} alignment={'center'}>
          <Text variant={'headingSmall'}>Custom Fields</Text>
        </Stack>

        <Stack direction={'vertical'} paddingVertical={'ExtraLarge'}>
          <ResponsiveGrid columns={2}>
            {Object.entries(customFields).flatMap(([key, value], i) => [
              <TextField
                key={i}
                label={key}
                value={value}
                onChange={(value: string) => {
                  setHasUnsavedChanges(true);
                  setCustomFields({
                    ...customFields,
                    [key]: value,
                  });
                }}
              />,
              <Button
                title={'Remove'}
                type={'destructive'}
                onPress={() => {
                  setHasUnsavedChanges(true);
                  setCustomFields(Object.fromEntries(Object.entries(customFields).filter(([k, v]) => k !== key)));
                }}
              />,
            ])}
          </ResponsiveGrid>
          {Object.keys(customFields).length === 0 && (
            <Stack direction="horizontal" alignment="center" paddingVertical={'Large'}>
              <Text variant="body" color="TextSubdued">
                No custom fields added
              </Text>
            </Stack>
          )}
        </Stack>

        <Stack direction={'vertical'} paddingVertical={'ExtraLarge'}>
          <ResponsiveGrid columns={2}>
            <TextField
              label={'New Field Name'}
              value={newCustomFieldName}
              onChange={setNewCustomFieldName}
              error={newCustomFieldNameError}
            />
            <Button title={'Add'} disabled={newCustomFieldNameError !== undefined} onPress={createNewCustomField} />
          </ResponsiveGrid>
        </Stack>

        <Stack direction={'vertical'} alignment={'center'}>
          <Button title={'Save'} type={'primary'} onPress={() => closePopup(customFields)} />
        </Stack>
      </ScrollView>
    </Screen>
  );
}
