import { ToastActionCallable } from '@teifi-digital/shopify-app-react';
import { CustomFieldsPresetType } from '@web/controllers/api/custom-fields-presets.js';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { useCustomFieldsPresetsQuery } from '@work-orders/common/queries/use-custom-fields-presets-query.js';
import { useCustomFieldsPresetsMutation } from '@work-orders/common/queries/use-custom-fields-presets-mutation.js';
import { useCustomFieldsPresetsDeleteMutation } from '@work-orders/common/queries/use-custom-fields-presets-delete-mutation.js';
import { useEffect, useState } from 'react';
import {
  AutoSelection,
  BlockStack,
  Box,
  Checkbox,
  Combobox,
  InlineError,
  Label,
  LegacyStack,
  Listbox,
  Modal,
  Spinner,
  Tag,
  Text,
  TextField,
} from '@shopify/polaris';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { titleCase } from '@teifi-digital/shopify-app-toolbox/string';

export function EditCustomFieldPresetModal({
  open,
  onClose,
  setToastAction,
  name: initialName,
  type,
}: {
  open: boolean;
  onClose: () => void;
  setToastAction: ToastActionCallable;
  name: string;
  type: CustomFieldsPresetType;
}) {
  const fetch = useAuthenticatedFetch({ setToastAction });
  const presetsQuery = useCustomFieldsPresetsQuery({ fetch, type });
  const presetMutation = useCustomFieldsPresetsMutation({ fetch, type });
  const presetDeleteMutation = useCustomFieldsPresetsDeleteMutation({ fetch, type });

  const [name, setName] = useState(initialName);
  const [keys, setKeys] = useState<string[]>([]);
  const [isDefault, setIsDefault] = useState(false);

  const [newCustomFieldName, setNewCustomFieldName] = useState('');
  const newCustomFieldNameError = (() => {
    if (keys.includes(newCustomFieldName)) {
      return 'A custom field with this name already exists';
    }

    return '';
  })();

  const preset = presetsQuery.data?.find(p => p.name === initialName);
  const presetNameInUse = presetsQuery.data?.some(preset => name !== initialName && preset.name === name) ?? false;

  useEffect(() => {
    if (preset) {
      setName(preset.name);
      setKeys(preset.keys);
      setIsDefault(preset.default);
    }
  }, [preset]);

  if (presetsQuery.isLoading) {
    return <Spinner />;
  }

  if (presetsQuery.isError) {
    return (
      <Box paddingBlock={'400'} paddingInline={'400'}>
        <Text as={'p'} tone={'critical'}>
          {extractErrorMessage(presetsQuery.error, 'An unknown error occurred while loading preset')}
        </Text>
      </Box>
    );
  }

  if (!preset) {
    return (
      <Box paddingBlock={'400'} paddingInline={'400'}>
        <Text as={'p'} tone={'critical'}>
          Preset not found
        </Text>
      </Box>
    );
  }

  return (
    <Modal
      open={open}
      title={'Edit Custom Field Preset'}
      onClose={onClose}
      primaryAction={{
        content: 'Save Preset',
        loading: presetMutation.isLoading,
        onAction: () =>
          presetMutation.mutate(
            { name, default: isDefault, keys },
            {
              onSuccess: () => {
                setToastAction({ content: 'Preset saved' });
                onClose();
              },
            },
          ),
        disabled: !name || !keys.length,
      }}
      secondaryActions={[
        {
          content: 'Cancel',
          onAction: onClose,
        },
        {
          content: 'Delete',
          loading: presetDeleteMutation.isLoading,
          destructive: true,
          onAction: () =>
            presetDeleteMutation.mutate(
              { name },
              {
                onSuccess: () => {
                  setToastAction({ content: 'Preset deleted' });
                  onClose();
                },
              },
            ),
        },
      ]}
    >
      <Modal.Section>
        <BlockStack gap={'400'}>
          <TextField
            label={'Preset Name'}
            autoComplete={'off'}
            requiredIndicator
            value={name}
            disabled={presetMutation.isLoading}
            onChange={(value: string) => setName(value)}
            error={presetNameInUse ? 'A preset with this name already exists. Saving will override it.' : undefined}
          />
          <BlockStack gap={'150'}>
            <Label id={'custom-fields'}>Custom Fields</Label>

            <Combobox
              allowMultiple
              activator={
                <Combobox.TextField
                  autoComplete={'off'}
                  label={'Custom Fields'}
                  labelHidden
                  value={newCustomFieldName}
                  onChange={setNewCustomFieldName}
                  placeholder={'New Custom Field'}
                  verticalContent={
                    <LegacyStack spacing="extraTight" alignment="center">
                      {keys.map(key => (
                        <Tag key={`option-${key}`} onRemove={() => setKeys(keys => keys.filter(k => k !== key))}>
                          {key}
                        </Tag>
                      ))}
                    </LegacyStack>
                  }
                />
              }
            >
              {!!newCustomFieldName.trim() && !keys.includes(newCustomFieldName.trim()) ? (
                <Listbox
                  autoSelection={AutoSelection.None}
                  onSelect={key => {
                    setKeys(keys => [...keys, key.trim()]);
                    setNewCustomFieldName('');
                  }}
                >
                  <Listbox.Action value={newCustomFieldName}>Add "{newCustomFieldName}"</Listbox.Action>
                </Listbox>
              ) : null}
            </Combobox>

            {keys.length === 0 && (
              <InlineError message={'You must add at least one custom field'} fieldID={'custom-fields'} />
            )}
          </BlockStack>
          <Checkbox
            label={'Default'}
            helpText={`Default presets are automatically applied to new ${titleCase(type).toLowerCase()}s`}
            checked={isDefault}
            onChange={setIsDefault}
          />
        </BlockStack>
      </Modal.Section>
    </Modal>
  );
}
