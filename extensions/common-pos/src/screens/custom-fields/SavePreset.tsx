import { useState } from 'react';
import { ScrollView, Stack, Text, useExtensionApi } from '@shopify/retail-ui-extensions-react';
import { useForm } from '@teifi-digital/pos-tools/form';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { FormStringField } from '@teifi-digital/pos-tools/form/components/FormStringField.js';
import { useDialog } from '@teifi-digital/pos-tools/providers/DialogProvider.js';
import { FormButton } from '@teifi-digital/pos-tools/form/components/FormButton.js';
import { UseRouter } from '../router.js';
import { CustomFieldsPresetType } from '@web/controllers/api/custom-fields-presets.js';
import { useCustomFieldsPresetsQuery } from '@work-orders/common/queries/use-custom-fields-presets-query.js';
import { useCustomFieldsPresetsMutation } from '@work-orders/common/queries/use-custom-fields-presets-mutation.js';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';

export type SavePresetProps = {
  keys: [string, ...string[]];
  useRouter: UseRouter;
  type: CustomFieldsPresetType;
};

export function SavePreset({ keys, useRouter, type }: SavePresetProps) {
  const [name, setName] = useState<string>('');
  const [isDefault, setIsDefault] = useState(false);

  const { Form } = useForm();
  const { toast } = useExtensionApi<'pos.home.modal.render'>();
  const router = useRouter();

  const fetch = useAuthenticatedFetch();
  const presetsQuery = useCustomFieldsPresetsQuery({ fetch, type });
  const presetMutation = useCustomFieldsPresetsMutation(
    { fetch, type },
    {
      onSuccess: () => {
        toast.show('Preset saved');
        router.popCurrent();
      },
    },
  );

  const presets = presetsQuery.data ?? [];
  const mutate = () => {
    presetMutation.mutate({ name, keys, default: isDefault });
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
            title={isDefault ? 'Is Default' : 'Is Not Default'}
            type={'basic'}
            onPress={() => setIsDefault(isDefault => !isDefault)}
          />

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
