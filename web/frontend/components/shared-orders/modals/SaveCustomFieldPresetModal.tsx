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

  const presetNameInUse = presetsQuery.data?.some(preset => preset.name === name) ?? false;

  return (
    <Modal
      title={'Save Custom Field Preset'}
      open={open}
      onClose={onClose}
      primaryAction={{
        content: !presetNameInUse ? 'Save preset' : 'Override preset',
        loading: presetMutation.isLoading,
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
            label={'Preset Name'}
            autoComplete={'off'}
            requiredIndicator
            value={name}
            disabled={presetMutation.isLoading}
            onChange={(value: string) => setName(value)}
            error={presetNameInUse ? 'A preset with this name already exists' : undefined}
          />
          <BlockStack gap={'150'}>
            <Label id={'selected-fields'}>Selected Fields</Label>
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
            {selectedFieldNames.length === 0 && (
              <InlineError message={'You must select at least one field'} fieldID={'selected-fields'} />
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
