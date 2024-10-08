import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { Button, ScrollView, Stack, Text, TextField, useApi } from '@shopify/ui-extensions-react/point-of-sale';
import { useUnsavedChangesDialog } from '@teifi-digital/pos-tools/hooks/use-unsaved-changes-dialog.js';
import { ResponsiveGrid } from '@teifi-digital/pos-tools/components/ResponsiveGrid.js';
import { useScreen } from '@teifi-digital/pos-tools/router';
import { useDialog } from '@teifi-digital/pos-tools/providers/DialogProvider.js';
import { ResponsiveStack } from '@teifi-digital/pos-tools/components/ResponsiveStack.js';
import { Route, UseRouter } from '../router.js';
import { SavePresetProps } from './SavePreset.js';
import { CustomFieldsPresetType } from '@web/controllers/api/custom-fields-presets.js';
import { SelectPresetToEditProps } from './SelectPresetToEdit.js';
import { EditPresetProps } from './EditPreset.js';
import { SelectPresetProps } from './SelectPreset.js';
import { CustomField } from '../../components/CustomField.js';
import { CustomFieldValuesConfigProps } from './CustomFieldValuesConfig.js';
import { ListPopupProps } from '../ListPopup.js';
import { isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';

export type CustomFieldConfigProps = {
  initialCustomFields: Record<string, string>;
  onSave: (customFields: Record<string, string>) => void;
  useRouter: UseRouter<{
    EditPreset: Route<EditPresetProps>;
    SavePreset: Route<SavePresetProps>;
    SelectPresetToEdit: Route<SelectPresetToEditProps>;
    SelectPreset: Route<SelectPresetProps>;
    CustomFieldValuesConfig: Route<CustomFieldValuesConfigProps>;
    ListPopup: Route<ListPopupProps>;
  }>;
  type: CustomFieldsPresetType;
};

export function CustomFieldConfig({ initialCustomFields, onSave, useRouter, type }: CustomFieldConfigProps) {
  const [customFields, setCustomFields] = useState<Record<string, string>>({ ...initialCustomFields });
  const hasUnsavedChanges = JSON.stringify(customFields) !== JSON.stringify(initialCustomFields);

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

  const createNewCustomField = () => {
    if (newCustomFieldName.trim().length === 0) {
      setNewCustomFieldNameError('Custom field name is required');
      return;
    }

    setNewCustomFieldName('');
    setNewCustomFieldNameError('');
    setCustomFields({
      ...customFields,
      [newCustomFieldName]: '',
    });
  };

  const screen = useScreen();
  screen.addOverrideNavigateBack(unsavedChangesDialog.show);

  const { toast } = useApi<'pos.home.modal.render'>();

  return (
    <ScrollView>
      <ResponsiveGrid columns={2}>
        <ResponsiveStack direction={'horizontal'} sm={{ alignment: 'center' }} paddingVertical={'ExtraLarge'}>
          <Text variant="headingLarge">Custom Fields</Text>
        </ResponsiveStack>

        <Button
          title={'Configure'}
          type={'plain'}
          onPress={() => {
            const keys = Object.keys(customFields);

            router.push('ListPopup', {
              title: 'Configure custom fields',
              selection: {
                type: 'select',
                items: [
                  keys.length > 0 ? { id: 'save-as-preset', leftSide: { label: 'Save as Preset' } } : null,
                  { id: 'import-preset', leftSide: { label: 'Import preset' } },
                  { id: 'edit-preset', leftSide: { label: 'Edit preset' } },
                  keys.length > 0
                    ? { id: 'change-values', leftSide: { label: 'Change allowed custom field values' } }
                    : null,
                ].filter(isNonNullable),
                onSelect: action => {
                  if (action === 'save-as-preset') {
                    router.push('SavePreset', {
                      keys,
                      useRouter,
                      type,
                    });
                    return;
                  }

                  if (action === 'import-preset') {
                    router.push('SelectPreset', {
                      onSelect: ({ keys }) => overrideOrMergeDialog.show(keys),
                      useRouter,
                      type,
                    });
                    return;
                  }

                  if (action === 'edit-preset') {
                    router.push('SelectPresetToEdit', {
                      useRouter,
                      type,
                    });
                    return;
                  }

                  if (action === 'change-values') {
                    router.push('ListPopup', {
                      title: 'Select custom field',
                      selection: {
                        type: 'select',
                        items: keys.map(key => ({ id: key, leftSide: { label: key } })),
                        onSelect: key =>
                          router.push('CustomFieldValuesConfig', {
                            name: key,
                            useRouter,
                          }),
                      },
                      useRouter,
                    });
                    return;
                  }

                  toast.show(`Unknown action ${action}`);
                },
              },
              useRouter,
            });
          }}
        />
      </ResponsiveGrid>

      <Stack direction={'vertical'} paddingVertical={'ExtraLarge'}>
        <ResponsiveGrid columns={1}>
          {Object.entries(customFields).map(([key, value]) => (
            <ResponsiveGrid columns={2} key={key}>
              <CustomField
                name={key}
                value={value}
                onChange={value =>
                  setCustomFields({
                    ...customFields,
                    [key]: value,
                  })
                }
                useRouter={useRouter}
              />

              <ResponsiveGrid columns={2}>
                <Button
                  title={'Remove'}
                  type={'destructive'}
                  onPress={() =>
                    setCustomFields(Object.fromEntries(Object.entries(customFields).filter(([k]) => k !== key)))
                  }
                />
                <Button
                  title={'Values'}
                  onPress={() => router.push('CustomFieldValuesConfig', { name: key, useRouter })}
                />
              </ResponsiveGrid>
            </ResponsiveGrid>
          ))}
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
            label={'New field name'}
            value={newCustomFieldName}
            onChange={setNewCustomFieldName}
            error={newCustomFieldNameError}
          />
          <Button title={'Add'} isDisabled={!!newCustomFieldNameError} onPress={createNewCustomField} />
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
          title: 'Import preset',
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
