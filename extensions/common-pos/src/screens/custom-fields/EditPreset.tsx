import { CustomFieldsPresetType } from '@web/controllers/api/custom-fields-presets.js';
import { Button, ScrollView, Text, TextField } from '@shopify/ui-extensions-react/point-of-sale';
import { useCustomFieldsPresetsQuery } from '@work-orders/common/queries/use-custom-fields-presets-query.js';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { useScreen } from '@teifi-digital/pos-tools/router';
import { useEffect, useState } from 'react';
import { useUnsavedChangesDialog } from '@teifi-digital/pos-tools/hooks/use-unsaved-changes-dialog.js';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { useCustomFieldsPresetsMutation } from '@work-orders/common/queries/use-custom-fields-presets-mutation.js';
import { FormStringField } from '@teifi-digital/pos-tools/components/form/FormStringField.js';
import { FormButton } from '@teifi-digital/pos-tools/components/form/FormButton.js';
import { Form } from '@teifi-digital/pos-tools/components/form/Form.js';
import { ResponsiveGrid } from '@teifi-digital/pos-tools/components/ResponsiveGrid.js';
import { ResponsiveStack } from '@teifi-digital/pos-tools/components/ResponsiveStack.js';
import { useDialog } from '@teifi-digital/pos-tools/providers/DialogProvider.js';
import { UseRouter } from '../router.js';
import { useCustomFieldsPresetsDeleteMutation } from '@work-orders/common/queries/use-custom-fields-presets-delete-mutation.js';

export type EditPresetProps = {
  name: string;
  type: CustomFieldsPresetType;
  useRouter: UseRouter;
};

// TODO : share main content with SavePreset
export function EditPreset({ name: initialName, type, useRouter }: EditPresetProps) {
  const fetch = useAuthenticatedFetch();
  const presetsQuery = useCustomFieldsPresetsQuery({ fetch, type });
  const presetMutation = useCustomFieldsPresetsMutation({ fetch, type });
  const presetDeleteMutation = useCustomFieldsPresetsDeleteMutation({ fetch, type });

  const [name, setName] = useState(initialName);
  const [keys, setKeys] = useState<string[]>([]);
  const [isDefault, setIsDefault] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const [newCustomFieldName, setNewCustomFieldName] = useState('');
  const newCustomFieldNameError = (() => {
    if (keys.includes(newCustomFieldName)) {
      return 'A custom field with this name already exists';
    }

    return '';
  })();

  const preset = presetsQuery.data?.presets?.find(p => p.name === initialName);
  const presetNameInUse =
    presetsQuery.data?.presets?.some(preset => name !== initialName && preset.name === name) ?? false;

  const unsavedChangesDialog = useUnsavedChangesDialog({ hasUnsavedChanges });
  const areYouSureYouWantToDeleteDialog = useAreYouSureYouWantToDeleteDialog({
    onDelete: () => presetDeleteMutation.mutate({ name }, { onSuccess: router.popCurrent }),
  });
  const areYouSureYouWantToOverwriteDialog = useAreYouSureYouWantToOverwriteDialog({
    isOverwrite: presetNameInUse,
    onOverwrite: () =>
      presetMutation.mutate(
        {
          currentName: initialName,
          name,
          keys,
          default: isDefault,
        },
        { onSuccess: router.popCurrent },
      ),
  });

  const router = useRouter();
  const screen = useScreen();
  screen.setTitle(`Edit Preset - ${name}`);
  screen.setIsLoading(presetsQuery.isLoading || presetMutation.isPending || presetDeleteMutation.isPending);
  screen.addOverrideNavigateBack(unsavedChangesDialog.show);

  useEffect(() => {
    if (preset) {
      setName(preset.name);
      setKeys(preset.keys);
      setIsDefault(preset.default);
    }
  }, [preset]);

  if (presetsQuery.isLoading) {
    return null;
  }

  if (presetsQuery.isError) {
    return (
      <ResponsiveStack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
        <Text color="TextCritical" variant="body">
          {extractErrorMessage(presetsQuery.error, 'An error occurred while loading preset')}
        </Text>
      </ResponsiveStack>
    );
  }

  if (!preset) {
    return (
      <ResponsiveStack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
        <Text color="TextCritical" variant="body">
          Preset not found
        </Text>
      </ResponsiveStack>
    );
  }

  return (
    <ScrollView>
      <ResponsiveStack direction={'horizontal'} alignment={'center'} paddingVertical={'ExtraLarge'}>
        <Text variant={'headingLarge'}>Edit Custom Field Preset</Text>
      </ResponsiveStack>

      {presetMutation.isError && (
        <ResponsiveStack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
          <Text color="TextCritical" variant="body">
            {extractErrorMessage(presetMutation.error, 'An error occurred while saving preset')}
          </Text>
        </ResponsiveStack>
      )}

      {presetDeleteMutation.isError && (
        <ResponsiveStack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
          <Text color="TextCritical" variant="body">
            {extractErrorMessage(presetDeleteMutation.error, 'An error occurred while deleting preset')}
          </Text>
        </ResponsiveStack>
      )}

      <Form disabled={presetMutation.isPending}>
        <ResponsiveStack direction={'vertical'} paddingHorizontal={'ExtraExtraLarge'}>
          <FormStringField
            label={'Preset name'}
            value={name}
            onChange={name => {
              setName(name);
              setHasUnsavedChanges(true);
            }}
            required
            helpText={presetNameInUse ? 'A preset with this name already exists. Saving will overwrite it.' : undefined}
          />
          <FormButton
            title={isDefault ? 'Is default' : 'Is not default'}
            type={'basic'}
            onPress={() => {
              setIsDefault(isDefault => !isDefault);
              setHasUnsavedChanges(true);
            }}
          />

          <ResponsiveStack direction={'vertical'} paddingVertical={'ExtraLarge'}>
            <ResponsiveGrid columns={2}>
              {keys.flatMap(key => [
                <FormStringField key={`${key}-value`} label={key} disabled />,
                <FormButton
                  key={`${key}-remove-button`}
                  title={'Remove'}
                  type={'destructive'}
                  onPress={() => {
                    setKeys(keys => keys.filter(k => k !== key));
                    setHasUnsavedChanges(true);
                  }}
                />,
              ])}
            </ResponsiveGrid>

            {keys.length === 0 && (
              <ResponsiveStack direction="horizontal" alignment="center" paddingVertical={'Large'}>
                <Text variant="body" color="TextSubdued">
                  No custom fields added
                </Text>
              </ResponsiveStack>
            )}
          </ResponsiveStack>

          <ResponsiveStack direction={'vertical'} paddingVertical={'ExtraLarge'}>
            <ResponsiveGrid columns={2}>
              <TextField
                label={'New field name'}
                value={newCustomFieldName}
                onChange={setNewCustomFieldName}
                error={newCustomFieldNameError}
              />
              <Button
                title={'Add'}
                isDisabled={!!newCustomFieldNameError || !!newCustomFieldName.trim()}
                onPress={() => {
                  setKeys(keys => [...keys, newCustomFieldName]);
                  setNewCustomFieldName('');
                  setHasUnsavedChanges(true);
                }}
              />
            </ResponsiveGrid>
          </ResponsiveStack>

          <FormButton
            title={'Save preset'}
            type={'primary'}
            action={'submit'}
            loading={presetMutation.isPending}
            onPress={areYouSureYouWantToOverwriteDialog.show}
          />

          <FormButton title={'Delete'} type={'destructive'} onPress={areYouSureYouWantToDeleteDialog.show} />

          <FormButton title={'Cancel'} type={'basic'} onPress={() => router.popCurrent()} />
        </ResponsiveStack>
      </Form>
    </ScrollView>
  );
}

const useAreYouSureYouWantToDeleteDialog = ({ onDelete }: { onDelete: () => void }) => {
  const dialog = useDialog();

  return {
    show: () => {
      dialog.show({
        onAction: onDelete,
        props: {
          title: 'Delete preset',
          type: 'destructive',
          content: 'You are about to permanently delete a preset. Are you sure you want to proceed?',
          actionText: 'Delete',
          showSecondaryAction: true,
          secondaryActionText: 'Cancel',
        },
      });
    },
  };
};

const useAreYouSureYouWantToOverwriteDialog = ({
  isOverwrite,
  onOverwrite,
}: {
  isOverwrite: boolean;
  onOverwrite: () => void;
}) => {
  const dialog = useDialog();

  return {
    show: () => {
      dialog.show({
        showDialog: isOverwrite,
        onAction: onOverwrite,
        props: {
          title: 'Overwrite preset',
          type: 'destructive',
          content: 'You are about to overwrite a preset. Are you sure you want to proceed?',
          actionText: 'Overwrite',
          showSecondaryAction: true,
          secondaryActionText: 'Cancel',
        },
      });
    },
  };
};
