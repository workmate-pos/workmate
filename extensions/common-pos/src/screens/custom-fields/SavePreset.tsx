import { useState } from 'react';
import { ScrollView, Stack, Text, useApi } from '@shopify/ui-extensions-react/point-of-sale';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { FormStringField } from '@teifi-digital/pos-tools/components/form/FormStringField.js';
import { Form } from '@teifi-digital/pos-tools/components/form/Form.js';
import { useDialog } from '@teifi-digital/pos-tools/providers/DialogProvider.js';
import { FormButton } from '@teifi-digital/pos-tools/components/form/FormButton.js';
import { UseRouter } from '../router.js';
import { CustomFieldsPresetType } from '@web/controllers/api/custom-fields-presets.js';
import { useCustomFieldsPresetsQuery } from '@work-orders/common/queries/use-custom-fields-presets-query.js';
import { useCustomFieldsPresetsMutation } from '@work-orders/common/queries/use-custom-fields-presets-mutation.js';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';

export type SavePresetProps = {
  keys: string[];
  useRouter: UseRouter;
  type: CustomFieldsPresetType;
};

export function SavePreset({ keys, useRouter, type }: SavePresetProps) {
  const [name, setName] = useState<string>('');
  const [isDefault, setIsDefault] = useState(false);

  const { toast } = useApi<'pos.home.modal.render'>();
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

  const presets = presetsQuery.data?.presets ?? [];
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
        <Text variant={'headingLarge'}>Save custom field Preset</Text>
      </Stack>

      <Form disabled={presetMutation.isPending || !router.isCurrent}>
        <Stack direction={'vertical'} paddingHorizontal={'ExtraExtraLarge'}>
          <FormStringField label={'Preset name'} value={name} onChange={setName} required />
          <FormButton
            title={isDefault ? 'Is default' : 'Is not default'}
            type={'basic'}
            onPress={() => setIsDefault(isDefault => !isDefault)}
          />

          <FormButton
            title={'Save preset'}
            type={'primary'}
            action={'submit'}
            loading={presetMutation.isPending}
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
          title: 'Preset name already in use',
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
