import { CreatePurchaseOrder } from '@web/schemas/generated/create-purchase-order.js';
import { CreatePurchaseOrderDispatchProxy } from '@work-orders/common/create-purchase-order/reducer.js';
import { BlockStack, Card, Text, TextField } from '@shopify/polaris';
import { Location } from '@web/frontend/pages/purchase-orders/[name].js';
import { CustomerSelectorModal } from '@web/frontend/components/shared-orders/modals/CustomerSelectorModal.js';
import { useToast } from '@teifi-digital/shopify-app-react';
import { useState } from 'react';

export function PurchaseOrderShippingCard({
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
  const [toast, setToastAction] = useToast();
  const [isCustomerSelectorModalOpen, setIsCustomerSelectorModalOpen] = useState(false);

  return (
    <Card>
      <BlockStack gap={'400'}>
        <Text as={'h2'} variant={'headingMd'} fontWeight={'bold'}>
          Shipping
        </Text>

        <TextField
          label={'Ship from'}
          autoComplete={'off'}
          value={createPurchaseOrder.shipFrom ?? ''}
          onChange={(value: string) => dispatch.setPartial({ shipFrom: value })}
          multiline={3}
          disabled={disabled}
        />

        <TextField
          label={'Ship to'}
          autoComplete={'off'}
          value={createPurchaseOrder.shipTo ?? ''}
          onChange={(value: string) => dispatch.setPartial({ shipTo: value })}
          multiline={3}
          labelAction={
            disabled
              ? undefined
              : {
                  NORMAL:
                    !selectedLocation || createPurchaseOrder.shipTo === selectedLocation.address.formatted.join('\n')
                      ? undefined
                      : {
                          content: 'Use location address',
                          onAction: () =>
                            dispatch.setPartial({ shipTo: selectedLocation.address.formatted.join('\n') }),
                        },
                  DROPSHIP: {
                    content: 'Select customer address',
                    onAction: () => setIsCustomerSelectorModalOpen(true),
                  },
                }[createPurchaseOrder.type]
          }
          disabled={disabled}
        />
      </BlockStack>

      <CustomerSelectorModal
        open={isCustomerSelectorModalOpen}
        onClose={() => setIsCustomerSelectorModalOpen(false)}
        onSelect={customer => {
          if (!customer.defaultAddress) {
            setToastAction({ content: 'This customer has no known address' });
            return;
          }

          dispatch.setPartial({ shipTo: customer.defaultAddress.formatted.join('\n') });
        }}
        setToastAction={setToastAction}
      />

      {toast}
    </Card>
  );
}
