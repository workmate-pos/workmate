import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { Button, ScrollView, Stack, Text, TextField } from '@shopify/retail-ui-extensions-react';
import { useUnsavedChangesDialog } from '@teifi-digital/pos-tools/hooks/use-unsaved-changes-dialog.js';
import { ResponsiveGrid } from '@teifi-digital/pos-tools/components/ResponsiveGrid.js';
import { useScreen } from '@teifi-digital/pos-tools/router';
import { useDialog } from '@teifi-digital/pos-tools/providers/DialogProvider.js';
import { ResponsiveStack } from '@teifi-digital/pos-tools/components/ResponsiveStack.js';
import { Route, UseRouter } from '../router.js';
import { ImportPresetProps } from './ImportPreset.js';
import { SavePresetProps } from './SavePreset.js';
import { CustomFieldsPresetType } from '@web/controllers/api/custom-fields-presets.js';

export type CustomFieldConfigProps = {
  initialCustomFields: Record<string, string>;
  onSave: (customFields: Record<string, string>) => void;
  useRouter: UseRouter<{
    ImportPreset: Route<ImportPresetProps>;
    SavePreset: Route<SavePresetProps>;
  }>;
  type: CustomFieldsPresetType;
};

export function CustomFieldConfig({ initialCustomFields, onSave, useRouter, type }: CustomFieldConfigProps) {
  const [customFields, setCustomFields] = useState<Record<string, string>>(initialCustomFields);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const [newCustomFieldName, setNewCustomFieldName] = useState('');
  const [newCustomFieldNameError, setNewCustomFieldNameError] = useState('');

  const unsavedChangesDialog = useUnsavedChangesDialog({ hasUnsavedChanges });
  const overrideOrMergeDialog = useOverrideOrMergeDialog({ customFields, setCustomFields });

  useEffect(() => {
    if (Object.keys(customFields).includes(newCustomFieldName)) {
      setNewCustomFieldNameError('A custom field with this name already exists');
    } else {
      setNewCustomFieldNameError('');
    }
  }, [newCustomFieldName]);

  const router = useRouter();

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

  const screen = useScreen();
  screen.addOverrideNavigateBack(unsavedChangesDialog.show);

  return (
    <ScrollView>
      <ResponsiveGrid columns={2}>
        <ResponsiveStack direction={'horizontal'} sm={{ alignment: 'center' }}>
          <Text variant="headingLarge">Custom Fields</Text>
        </ResponsiveStack>
        <ResponsiveStack
          direction={'horizontal'}
          alignment={'flex-end'}
          sm={{ alignment: 'center', paddingVertical: 'Small' }}
        >
          <Button
            title={'Save as Preset'}
            type={'plain'}
            isDisabled={!isNonEmptyArray(Object.keys(customFields))}
            onPress={() => {
              const keys = Object.keys(customFields);

              if (isNonEmptyArray(keys)) {
                router.push('SavePreset', {
                  keys,
                  useRouter,
                  type,
                });
              }
            }}
          />
          <Button
            title={'Import Preset'}
            type={'plain'}
            onPress={() => {
              router.push('ImportPreset', {
                onImport: ({ keys }) => overrideOrMergeDialog.show(keys),
                useRouter,
                type,
              });
            }}
          />
        </ResponsiveStack>
      </ResponsiveGrid>

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
          <Button title={'Add'} disabled={!!newCustomFieldNameError} onPress={createNewCustomField} />
        </ResponsiveGrid>
      </Stack>

      <Stack direction={'vertical'} alignment={'center'}>
        <Button
          title={'Save'}
          type={'primary'}
          onPress={() => {
            onSave(customFields);
            router.popCurrent();
          }}
        />
      </Stack>
    </ScrollView>
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
