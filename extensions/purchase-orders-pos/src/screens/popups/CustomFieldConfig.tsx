import { useScreen } from '@work-orders/common-pos/hooks/use-screen.js';
import { Dispatch, ReactNode, SetStateAction, useEffect, useState } from 'react';
import { useUnsavedChangesDialog } from '@work-orders/common-pos/hooks/use-unsaved-changes-dialog.js';
import { Button, ScrollView, Stack, Text, TextField } from '@shopify/retail-ui-extensions-react';
import { ResponsiveGrid } from '@work-orders/common-pos/components/ResponsiveGrid.js';
import { useScreenSize } from '@work-orders/common-pos/providers/ScreenSizeProvider.js';
import { useDialog } from '@work-orders/common-pos/providers/DialogProvider.js';

export function CustomFieldConfig() {
  const [customFields, setCustomFields] = useState<Record<string, string>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const [newCustomFieldName, setNewCustomFieldName] = useState('');
  const [newCustomFieldNameError, setNewCustomFieldNameError] = useState('');

  const { Screen, closePopup, usePopup } = useScreen('CustomFieldConfig', ({ customFields }) => {
    setCustomFields(customFields);
    setHasUnsavedChanges(false);

    setNewCustomFieldName('');
    setNewCustomFieldNameError('');
  });

  const savePresetPopup = usePopup('SavePreset');
  const importPresetPopup = usePopup('ImportPreset', ({ keys }) => overrideOrMergeDialog.show(keys));
  const unsavedChangesDialog = useUnsavedChangesDialog({ hasUnsavedChanges });
  const overrideOrMergeDialog = useOverrideOrMergeDialog({ customFields, setCustomFields });

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

  const screenSize = useScreenSize();

  const saveAsPreset = (
    <Button
      title={'Save as Preset'}
      type={'plain'}
      isDisabled={!isNonEmptyArray(Object.keys(customFields))}
      onPress={() => {
        const keys = Object.keys(customFields);

        if (isNonEmptyArray(keys)) {
          savePresetPopup.navigate({ keys });
        }
      }}
    />
  );

  const importPreset = <Button title={'Import Preset'} type={'plain'} onPress={importPresetPopup.navigate} />;

  const headingOptions: Record<typeof screenSize, ReactNode> = {
    tablet: (
      <ResponsiveGrid columns={2}>
        <Text variant="headingLarge">Custom Fields</Text>
        <Stack direction={'horizontal'} alignment={'flex-end'}>
          {saveAsPreset}
          {importPreset}
        </Stack>
      </ResponsiveGrid>
    ),
    mobile: (
      <ResponsiveGrid columns={1}>
        <Stack direction={'horizontal'} alignment={'center'} paddingVertical={'Small'}>
          <Text variant="headingLarge">Custom Fields</Text>
        </Stack>
        <Stack direction={'horizontal'} flexChildren paddingVertical={'HalfPoint'}>
          {saveAsPreset}
          {importPreset}
        </Stack>
      </ResponsiveGrid>
    ),
  };

  return (
    <Screen title="Custom Fields" overrideNavigateBack={unsavedChangesDialog.show} presentation={{ sheet: true }}>
      <ScrollView>
        {headingOptions[screenSize]}

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
                  setCustomFields(Object.fromEntries(Object.entries(customFields).filter(([k]) => k !== key)));
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

function isNonEmptyArray<T>(value: T[]): value is [T, ...T[]] {
  return value.length > 0;
}

/**
 * Whether an imported preset should override or merge with the existing custom fields
 */
const useOverrideOrMergeDialog = ({
  customFields,
  setCustomFields,
}: {
  customFields: Record<string, string>;
  setCustomFields: Dispatch<SetStateAction<Record<string, string>>>;
}) => {
  const dialog = useDialog();
  const showDialog = Object.keys(customFields).length > 0;

  return {
    show: (keys: string[]) => {
      const merge = () =>
        setCustomFields(current => ({ ...Object.fromEntries(keys.map(key => [key, ''])), ...current }));
      const override = () => setCustomFields(Object.fromEntries(keys.map(key => [key, ''])));

      dialog.show({
        showDialog,
        onAction: merge,
        onSecondaryAction: override,
        props: {
          title: 'Import Preset',
          type: 'alert',
          showSecondaryAction: true,
          actionText: 'Merge',
          secondaryActionText: 'Override',
          content: 'Do you want to merge or override the existing custom fields?',
        },
      });
    },
  };
};
