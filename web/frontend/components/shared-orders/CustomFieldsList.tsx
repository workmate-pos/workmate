import { BlockStack, Button, ButtonGroup, InlineStack, Text, TextField } from '@shopify/polaris';

export type CustomFieldsListProps = {
  customFields: Record<string, string>;
  onUpdate: (customFields: Record<string, string>) => void;
  disabled?: boolean;
  onImportPresetClick: () => void;
  onSavePresetClick: () => void;
  onAddCustomFieldClick: () => void;
};

export function CustomFieldsList({
  customFields,
  onUpdate,
  disabled,
  onImportPresetClick,
  onSavePresetClick,
  onAddCustomFieldClick,
}: CustomFieldsListProps) {
  return (
    <BlockStack gap={'400'}>
      <InlineStack align={'space-between'}>
        <Text as={'h2'} variant={'headingMd'} fontWeight={'bold'}>
          Custom Fields
        </Text>
        <ButtonGroup>
          <Button variant={'plain'} onClick={() => onImportPresetClick()} disabled={disabled}>
            Import preset
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
        <TextField
          key={key}
          autoComplete={'off'}
          label={key}
          value={value}
          onChange={(value: string) => onUpdate({ ...customFields, [key]: value })}
          labelAction={
            !disabled
              ? {
                  content: 'Remove',
                  onAction: () => {
                    const filteredCustomFields = Object.fromEntries(
                      Object.entries(customFields).filter(([k]) => k !== key),
                    );
                    onUpdate(filteredCustomFields);
                  },
                }
              : undefined
          }
          disabled={disabled}
        />
      ))}

      <Button onClick={() => onAddCustomFieldClick()} disabled={disabled}>
        Add Custom Field
      </Button>
    </BlockStack>
  );
}
