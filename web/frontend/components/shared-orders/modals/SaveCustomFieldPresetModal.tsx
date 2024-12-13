import { ToastActionCallable } from '@teifi-digital/shopify-app-react';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { useState } from 'react';
import { BlockStack, Checkbox, InlineError, InlineGrid, Label, Modal, TextField } from '@shopify/polaris';
import { useCustomFieldsPresetsQuery } from '@work-orders/common/queries/use-custom-fields-presets-query.js';
import { useCustomFieldsPresetsMutation } from '@work-orders/common/queries/use-custom-fields-presets-mutation.js';
import { CustomFieldsPresetType } from '@web/controllers/api/custom-fields-presets.js';
import { titleCase } from '@teifi-digital/shopify-app-toolbox/string';

export function SaveCustomFieldPresetModal({
  fieldNames,
  open,
  onClose,
  setToastAction,
  type,
}: {
  fieldNames: string[];
  open: boolean;
  onClose: () => void;
  setToastAction: ToastActionCallable;
  type: CustomFieldsPresetType;
}) {
  const fetch = useAuthenticatedFetch({ setToastAction });
  const presetsQuery = useCustomFieldsPresetsQuery({ fetch, type });
  const presetMutation = useCustomFieldsPresetsMutation({ fetch, type });

  const [name, setName] = useState('');
  const [selectedFieldNames, setSelectedFieldNames] = useState(fieldNames);
  const [isDefault, setIsDefault] = useState(false);

  const presetNameInUse = presetsQuery.data?.presets?.some(preset => preset.name === name) ?? false;

  return (
    <Modal
      title={'Save custom field preset'}
      open={open}
      onClose={onClose}
      primaryAction={{
        content: !presetNameInUse ? 'Save preset' : 'Override preset',
        loading: presetMutation.isPending,
        onAction: async () => {
          if (!selectedFieldNames.length) {
            return;
          }

          await presetMutation.mutateAsync({
            name,
            keys: selectedFieldNames as [string, ...string[]],
            default: isDefault,
          });
          setToastAction({ content: 'Preset saved' });
          onClose();
        },
        disabled: !name || !selectedFieldNames.length,
      }}
      secondaryActions={[{ content: 'Cancel', onAction: onClose }]}
    >
      <Modal.Section>
        <BlockStack gap={'400'}>
          <TextField
            label={'Preset name'}
            autoComplete={'off'}
            requiredIndicator
            value={name}
            disabled={presetMutation.isPending}
            onChange={(value: string) => setName(value)}
            error={presetNameInUse ? 'A preset with this name already exists' : undefined}
          />
          <BlockStack gap={'150'}>
            <Label id={'selected-fields'}>Selected fields</Label>
            {selectedFieldNames.length === 0 && (
              <InlineError message={'You must select at least one field'} fieldID={'selected-fields'} />
            )}
            <InlineGrid gap={'400'} columns={2}>
              {fieldNames.map(fieldName => (
                <Checkbox
                  key={fieldName}
                  label={fieldName}
                  value={fieldName}
                  checked={selectedFieldNames.includes(fieldName)}
                  onChange={checked => {
                    if (checked) {
                      setSelectedFieldNames([...selectedFieldNames, fieldName]);
                    } else {
                      setSelectedFieldNames(selectedFieldNames.filter(f => f !== fieldName));
                    }
                  }}
                />
              ))}
            </InlineGrid>
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
