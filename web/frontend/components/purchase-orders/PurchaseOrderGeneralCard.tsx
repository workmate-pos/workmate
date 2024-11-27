import { CreatePurchaseOrder } from '@web/schemas/generated/create-purchase-order.js';
import { CreatePurchaseOrderDispatchProxy } from '@work-orders/common/create-purchase-order/reducer.js';
import { BlockStack, Card, Select, Text, TextField } from '@shopify/polaris';
import { useToast } from '@teifi-digital/shopify-app-react';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { useState } from 'react';
import { DateModal } from '@web/frontend/components/shared-orders/modals/DateModal.js';
import { DateTime } from '@web/schemas/generated/create-work-order.js';
import { sentenceCase } from '@teifi-digital/shopify-app-toolbox/string';
import { useSupplierQuery } from '@work-orders/common/queries/use-supplier-query.js';
import { useLocationQuery } from '@work-orders/common/queries/use-location-query.js';

const TODAY_DATE = new Date();
TODAY_DATE.setHours(0, 0, 0, 0);

const PURCHASE_ORDER_TYPES: CreatePurchaseOrder['type'][] = ['NORMAL', 'DROPSHIP'];

export function PurchaseOrderGeneralCard({
  createPurchaseOrder,
  dispatch,
  disabled,
  onVendorSelectorClick,
  onLocationSelectorClick,
}: {
  createPurchaseOrder: CreatePurchaseOrder;
  dispatch: CreatePurchaseOrderDispatchProxy;
  disabled: boolean;
  onVendorSelectorClick: () => void;
  onLocationSelectorClick: () => void;
}) {
  const [isDateModalOpen, setIsDateModalOpen] = useState(false);

  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });

  const supplierQuery = useSupplierQuery({ fetch, id: createPurchaseOrder.supplierId });

  const locationQuery = useLocationQuery({ fetch, id: createPurchaseOrder.locationId });
  const location = locationQuery.data;

  const placedDate = createPurchaseOrder.placedDate ? new Date(createPurchaseOrder.placedDate) : null;

  return (
    <>
      <Card>
        <BlockStack gap={'400'}>
          <Text as={'h2'} variant={'headingMd'} fontWeight={'bold'}>
            General
          </Text>

          <Select
            label="Type"
            helpText="Dropship orders do not count towards your inventory quantities."
            value={createPurchaseOrder.type}
            placeholder="Select a type"
            requiredIndicator
            options={PURCHASE_ORDER_TYPES.map(type => ({
              label: sentenceCase(type),
              value: type,
            }))}
            onChange={(value: (typeof PURCHASE_ORDER_TYPES)[number]) => dispatch.setPartial({ type: value })}
            disabled={disabled}
          />

          <TextField
            label="Supplier"
            autoComplete={'off'}
            requiredIndicator
            value={supplierQuery.data?.name}
            loading={supplierQuery.isLoading}
            onFocus={() => onVendorSelectorClick()}
            disabled={disabled || (!!createPurchaseOrder.name && createPurchaseOrder.supplierId !== null)}
            readOnly
          />

          <TextField
            label={'Location'}
            requiredIndicator
            autoComplete={'off'}
            loading={locationQuery.isLoading}
            value={
              locationQuery.isLoading
                ? ''
                : createPurchaseOrder.locationId
                  ? (location?.name ?? 'Unknown location')
                  : ''
            }
            onFocus={() => onLocationSelectorClick()}
            multiline
            disabled={disabled || (!!createPurchaseOrder.name && createPurchaseOrder.locationId !== null)}
            readOnly
          />
          <TextField
            label={'Note'}
            autoComplete={'off'}
            value={createPurchaseOrder.note ?? ''}
            multiline={2}
            onChange={note => dispatch.setPartial({ note })}
            disabled={disabled}
          />

          <TextField
            label={'Placed date'}
            autoComplete={'off'}
            value={placedDate?.toLocaleDateString()}
            disabled={disabled}
            readOnly
            onFocus={() => setIsDateModalOpen(true)}
            labelAction={
              placedDate
                ? {
                    content: 'Remove',
                    onAction: () => dispatch.setPartial({ placedDate: null }),
                  }
                : createPurchaseOrder.placedDate !== TODAY_DATE.toISOString()
                  ? {
                      content: 'Today',
                      onAction: () => {
                        dispatch.setPartial({ placedDate: TODAY_DATE.toISOString() as DateTime });
                      },
                    }
                  : undefined
            }
          />
        </BlockStack>
      </Card>

      {isDateModalOpen && (
        <DateModal
          open={isDateModalOpen}
          onClose={() => setIsDateModalOpen(false)}
          onUpdate={placedDate => dispatch.setPartial({ placedDate: placedDate.toISOString() as DateTime })}
          initialDate={placedDate ?? new Date()}
        />
      )}

      {toast}
    </>
  );
}
