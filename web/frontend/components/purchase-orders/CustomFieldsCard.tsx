import { CreatePurchaseOrder } from '@web/schemas/generated/create-purchase-order.js';
import { CreatePurchaseOrderDispatchProxy } from '@work-orders/common/create-purchase-order/reducer.js';
import { BlockStack, Button, ButtonGroup, Card, InlineStack, Text, TextField } from '@shopify/polaris';

export function CustomFieldsCard({
  createPurchaseOrder,
  dispatch,
  disabled,
  onImportPresetClick,
  onSavePresetClick,
  onAddCustomFieldClick,
}: {
  createPurchaseOrder: CreatePurchaseOrder;
  dispatch: CreatePurchaseOrderDispatchProxy;
  disabled: boolean;
  onImportPresetClick: () => void;
  onSavePresetClick: () => void;
  onAddCustomFieldClick: () => void;
}) {
  return (
    <Card>
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
              disabled={Object.keys(createPurchaseOrder.customFields).length === 0 || disabled}
              onClick={() => onSavePresetClick()}
            >
              Save as preset
            </Button>
          </ButtonGroup>
        </InlineStack>

        {Object.entries(createPurchaseOrder.customFields).map(([key, value], i) => (
          <TextField
            key={i}
            autoComplete={'off'}
            label={key}
            value={value}
            onChange={(value: string) =>
              dispatch.setPartial({ customFields: { ...createPurchaseOrder.customFields, [key]: value } })
            }
            labelAction={
              !disabled
                ? {
                    content: 'Remove',
                    onAction: () => {
                      const filteredCustomFields = Object.fromEntries(
                        Object.entries(createPurchaseOrder.customFields).filter(([k]) => k !== key),
                      );
                      dispatch.setPartial({ customFields: filteredCustomFields });
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
    </Card>
  );
}
