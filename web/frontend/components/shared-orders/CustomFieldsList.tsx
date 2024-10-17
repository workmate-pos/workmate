import { BlockStack, Button, ButtonGroup, InlineStack, Text, TextField } from '@shopify/polaris';
import { CustomField } from '@web/frontend/components/shared-orders/CustomField.js';
import { sentenceCase } from '@teifi-digital/shopify-app-toolbox/string';

export type CustomFieldsListProps = {
  kind: 'line-item' | 'work-order' | 'purchase-order';
  customFields: Record<string, string>;
  onUpdate: (customFields: Record<string, string>) => void;
  disabled?: boolean;
  onPresetsClick: () => void;
  onSavePresetClick: () => void;
  onAddCustomFieldClick: () => void;
  onFieldValuesClick: () => void;
};

export function CustomFieldsList({
  kind,
  customFields,
  onUpdate,
  disabled,
  onPresetsClick,
  onSavePresetClick,
  onAddCustomFieldClick,
  onFieldValuesClick,
}: CustomFieldsListProps) {
  return (
    <BlockStack gap={'400'}>
      <InlineStack align={'space-between'}>
        <Text as={'h2'} variant={'headingMd'} fontWeight={'bold'}>
          {sentenceCase(kind === 'line-item' ? `${kind} custom fields` : 'custom fields')}
        </Text>
        <ButtonGroup>
          <Button variant={'plain'} onClick={() => onFieldValuesClick()} disabled={disabled}>
            Field values
          </Button>
          <Button variant={'plain'} onClick={() => onPresetsClick()} disabled={disabled}>
            Presets
          </Button>
          <Button
            variant={'plain'}
            disabled={Object.keys(customFields).length === 0 || disabled}
            onClick={() => onSavePresetClick()}
          >
            Save as preset
          </Button>
        </ButtonGroup>
      </InlineStack>

      {Object.entries(customFields).map(([key, value]) => (
        <CustomField
          key={key}
          name={key}
          value={value}
          disabled={disabled}
          onChange={value => onUpdate({ ...customFields, [key]: value })}
          onRemove={() => onUpdate(Object.fromEntries(Object.entries(customFields).filter(([k]) => k !== key)))}
        />
      ))}

      <Button onClick={() => onAddCustomFieldClick()} disabled={disabled}>
        Add custom field
      </Button>
    </BlockStack>
  );
}
