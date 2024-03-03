import { useState } from 'react';
import { Button, ScrollView, Stack, Text, useExtensionApi } from '@shopify/retail-ui-extensions-react';
import { usePurchaseOrderCustomFieldsPresetMutation } from '@work-orders/common/queries/use-purchase-order-custom-fields-preset-mutation.js';
import { usePurchaseOrderCustomFieldsPresetsQuery } from '@work-orders/common/queries/use-purchase-order-custom-fields-presets-query.js';
import { useForm } from '@teifi-digital/pos-tools/form';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { FormStringField } from '@teifi-digital/pos-tools/form/components/FormStringField.js';
import { stringLengthValidator } from '../../util/string-length-validator.js';
import { extractErrorMessage } from '@teifi-digital/pos-tools/utils/errors.js';
import { useDialog } from '@teifi-digital/pos-tools/providers/DialogProvider.js';
import { useRouter } from '../../routes.js';

export function SavePreset({ keys }: { keys: [string, ...string[]] }) {
  const [name, setName] = useState<string>('');

  const { Form, isValid } = useForm();
  const { toast } = useExtensionApi<'pos.home.modal.render'>();

  const router = useRouter();

  const fetch = useAuthenticatedFetch();
  const presetsQuery = usePurchaseOrderCustomFieldsPresetsQuery({ fetch });
  const presetMutation = usePurchaseOrderCustomFieldsPresetMutation(
    { fetch },
    {
      onSuccess: () => {
        toast.show('Preset saved');
        router.popCurrent();
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
          <FormStringField
            label={'Preset Name'}
            value={name}
            onChange={setName}
            validator={stringLengthValidator({ min: 1 })}
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
