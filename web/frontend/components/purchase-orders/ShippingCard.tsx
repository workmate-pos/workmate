import { CreatePurchaseOrder } from '@web/schemas/generated/create-purchase-order.js';
import { CreatePurchaseOrderDispatchProxy } from '@work-orders/common/create-purchase-order/reducer.js';
import { BlockStack, Card, Text, TextField } from '@shopify/polaris';
import { Location } from '@web/frontend/pages/purchase-orders/[name].js';

export function ShippingCard({
  createPurchaseOrder,
  dispatch,
  disabled,
  selectedLocation,
}: {
  createPurchaseOrder: CreatePurchaseOrder;
  dispatch: CreatePurchaseOrderDispatchProxy;
  disabled: boolean;
  selectedLocation: Location;
}) {
  return (
    <Card>
      <BlockStack gap={'400'}>
        <Text as={'h2'} variant={'headingMd'} fontWeight={'bold'}>
          Shipping
        </Text>

        <TextField
          label={'Ship From'}
          autoComplete={'off'}
          value={createPurchaseOrder.shipFrom ?? ''}
          onChange={(value: string) => dispatch.setPartial({ shipFrom: value })}
          multiline={3}
          disabled={disabled}
        />
        <TextField
          label={'Ship To'}
          autoComplete={'off'}
          value={createPurchaseOrder.shipTo ?? ''}
          onChange={(value: string) => dispatch.setPartial({ shipTo: value })}
          multiline={3}
          labelAction={
            !disabled &&
            selectedLocation &&
            createPurchaseOrder.shipTo !== selectedLocation.address.formatted.join('\n')
              ? {
                  content: 'Use location address',
                  onAction() {
                    dispatch.setPartial({ shipTo: selectedLocation.address.formatted.join('\n') });
                  },
                }
              : undefined
          }
          disabled={disabled}
        />
      </BlockStack>
    </Card>
  );
}
