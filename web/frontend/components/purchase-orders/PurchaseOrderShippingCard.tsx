import { CreatePurchaseOrder } from '@web/schemas/generated/create-purchase-order.js';
import { CreatePurchaseOrderDispatchProxy } from '@work-orders/common/create-purchase-order/reducer.js';
import { BlockStack, Card, Text, TextField } from '@shopify/polaris';
import { CustomerSelectorModal } from '@web/frontend/components/shared-orders/modals/CustomerSelectorModal.js';
import { useToast } from '@teifi-digital/shopify-app-react';
import { useEffect, useState } from 'react';
import { useSupplierQuery } from '@work-orders/common/queries/use-supplier-query.js';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { useLocationQuery } from '@work-orders/common/queries/use-location-query.js';

export function PurchaseOrderShippingCard({
  createPurchaseOrder,
  dispatch,
  disabled,
}: {
  createPurchaseOrder: CreatePurchaseOrder;
  dispatch: CreatePurchaseOrderDispatchProxy;
  disabled: boolean;
}) {
  const [toast, setToastAction] = useToast();

  const fetch = useAuthenticatedFetch({ setToastAction });

  const locationQuery = useLocationQuery({ fetch, id: createPurchaseOrder.locationId });
  const location = locationQuery.data;

  const supplierQuery = useSupplierQuery({ fetch, id: createPurchaseOrder.supplierId });
  const supplier = supplierQuery.data;

  // Default "Ship to" to selected location's address
  useEffect(() => {
    if (!location) return;
    if (createPurchaseOrder.shipTo) return;
    dispatch.setPartial({ shipTo: location.address?.formatted?.join('\n') ?? null });
  }, [location]);

  // Default "Ship from" to vendor's default address
  useEffect(() => {
    if (!supplier?.address) return;
    if (createPurchaseOrder.shipFrom) return;
    dispatch.setPartial({ shipFrom: supplier.address });
  }, [supplier]);

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
          labelAction={
            disabled || !supplierQuery.data?.address || createPurchaseOrder.shipFrom === supplierQuery.data.address
              ? undefined
              : {
                  content: 'Use supplier address',
                  onAction: () => dispatch.setPartial({ shipFrom: supplierQuery.data.address ?? '' }),
                }
          }
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
                    !location || createPurchaseOrder.shipTo === location.address.formatted.join('\n')
                      ? undefined
                      : {
                          content: 'Use location address',
                          onAction: () => dispatch.setPartial({ shipTo: location.address.formatted.join('\n') }),
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
