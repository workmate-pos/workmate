import { useState } from 'react';
import { Button, ScrollView, Stack, Text, useExtensionApi } from '@shopify/retail-ui-extensions-react';
import { useForm } from '@work-orders/common-pos/hooks/use-form.js';
import { usePurchaseOrderCustomFieldsPresetMutation } from '@work-orders/common/queries/use-purchase-order-custom-fields-preset-mutation.js';
import { useAuthenticatedFetch } from '@work-orders/common-pos/hooks/use-authenticated-fetch.js';
import { extractErrorMessage } from '@work-orders/common-pos/util/errors.js';
import { usePurchaseOrderCustomFieldsPresetsQuery } from '@work-orders/common/queries/use-purchase-order-custom-fields-presets-query.js';
import { useDialog } from '@work-orders/common-pos/providers/DialogProvider.js';
import { StringField, stringLengthValidator } from '@work-orders/common-pos/components/StringField.js';

export function SavePreset({ keys, onSave }: { keys: [string, ...string[]]; onSave: () => void }) {
  const [name, setName] = useState<string>('');

  const { Form, isValid } = useForm();
  const { toast } = useExtensionApi<'pos.home.modal.render'>();

  const fetch = useAuthenticatedFetch();
  const presetsQuery = usePurchaseOrderCustomFieldsPresetsQuery({ fetch });
  const presetMutation = usePurchaseOrderCustomFieldsPresetMutation(
    { fetch },
    {
      onSuccess: () => {
        onSave();
        toast.show('Preset saved');
      },
    },
  );

  const presets = presetsQuery.data ?? [];
  const mutate = () => {
    presetMutation.mutate({ name, keys });
  };

  const presetNameInUse = presets.some(preset => preset.name === name);
  const presetNameInUseDialog = usePresetNameInUseDialog({
    name,
    presetNameInUse,
    mutate,
  });

  return (
    <ScrollView>
      <Stack direction={'horizontal'} alignment={'center'} paddingVertical={'ExtraLarge'}>
        <Text variant={'headingLarge'}>Save Custom Field Preset</Text>
      </Stack>

      <Form disabled={presetMutation.isLoading}>
        <Stack direction={'vertical'} paddingHorizontal={'ExtraExtraLarge'}>
          <StringField
            label={'Preset Name'}
            value={name}
            onChange={setName}
            validate={stringLengthValidator({ min: 1 })}
          />

          <Button
            title={'Save Preset'}
            type={'primary'}
            isLoading={presetMutation.isLoading}
            isDisabled={!isValid}
            onPress={presetNameInUseDialog.show}
          />

          {presetMutation.isError && (
            <Stack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
              <Text color="TextCritical" variant="body">
                {extractErrorMessage(presetMutation.error, 'An error occurred while saving your preset')}
              </Text>
            </Stack>
          )}

          {presetsQuery.isError && (
            <Stack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
              <Text color="TextCritical" variant="body">
                {extractErrorMessage(presetsQuery.error, 'An error occurred while loading your existing presets')}
              </Text>
            </Stack>
          )}
        </Stack>
      </Form>
    </ScrollView>
  );
}

const usePresetNameInUseDialog = ({
  name,
  presetNameInUse,
  mutate,
}: {
  name: string;
  presetNameInUse: boolean;
  mutate: () => void;
}) => {
  const dialog = useDialog();

  return {
    show: () => {
      dialog.show({
        onAction: mutate,
        showDialog: presetNameInUse,
        props: {
          title: 'Preset Name In Use',
          content: `'${name}' preset already exists. Do you want to override it?`,
          type: 'alert',
          actionText: 'Override',
          secondaryActionText: 'Cancel',
          showSecondaryAction: true,
        },
      });
    },
  };
};
