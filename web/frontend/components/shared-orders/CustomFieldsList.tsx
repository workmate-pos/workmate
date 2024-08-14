import { BlockStack, Button, ButtonGroup, InlineStack, Text } from '@shopify/polaris';
import { CustomField } from '@web/frontend/components/shared-orders/CustomField.js';

export type CustomFieldsListProps = {
  customFields: Record<string, string>;
  onUpdate: (customFields: Record<string, string>) => void;
  disabled?: boolean;
  onPresetsClick: () => void;
  onSavePresetClick: () => void;
  onAddCustomFieldClick: () => void;
  onFieldValuesClick: () => void;
};

export function CustomFieldsList({
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
          Custom Fields
        </Text>
        <ButtonGroup>
          <Button variant={'plain'} onClick={() => onFieldValuesClick()} disabled={disabled}>
            Field Values
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
          name={key}
          value={value}
          disabled={disabled}
          onChange={value => onUpdate({ ...customFields, [key]: value })}
          onRemove={() => onUpdate(Object.fromEntries(Object.entries(customFields).filter(([k]) => k !== key)))}
        />
      ))}

      <Button onClick={() => onAddCustomFieldClick()} disabled={disabled}>
        Add Custom Field
      </Button>
    </BlockStack>
  );
}
