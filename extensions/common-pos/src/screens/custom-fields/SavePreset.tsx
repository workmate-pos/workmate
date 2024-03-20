import { useState } from 'react';
import { ScrollView, Stack, Text, useExtensionApi } from '@shopify/retail-ui-extensions-react';
import { useForm } from '@teifi-digital/pos-tools/form';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { FormStringField } from '@teifi-digital/pos-tools/form/components/FormStringField.js';
import { extractErrorMessage } from '@teifi-digital/pos-tools/utils/errors.js';
import { useDialog } from '@teifi-digital/pos-tools/providers/DialogProvider.js';
import { FormButton } from '@teifi-digital/pos-tools/form/components/FormButton.js';
import { useWorkOrderCustomFieldsPresetsQuery } from '@work-orders/common/queries/use-work-order-custom-fields-presets-query.js';
import { useWorkOrderCustomFieldsPresetMutation } from '@work-orders/common/queries/use-work-order-custom-fields-preset-mutation.js';
import { UseRouter } from '../router.js';

export type SavePresetProps = {
  keys: [string, ...string[]];
  useRouter: UseRouter;
};

export function SavePreset({ keys, useRouter }: SavePresetProps) {
  const [name, setName] = useState<string>('');

  const { Form } = useForm();
  const { toast } = useExtensionApi<'pos.home.modal.render'>();
  const router = useRouter();

  const fetch = useAuthenticatedFetch();
  // TODO: Fix this to be a choice - have one query with both options
  const presetsQuery = useWorkOrderCustomFieldsPresetsQuery({ fetch });
  const presetMutation = useWorkOrderCustomFieldsPresetMutation(
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
          <FormStringField label={'Preset Name'} value={name} onChange={setName} required />

          <FormButton
            title={'Save Preset'}
            type={'primary'}
            action={'submit'}
            loading={presetMutation.isLoading}
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
