import { CreatePurchaseOrder } from '@web/schemas/generated/create-purchase-order.js';
import { CreatePurchaseOrderDispatchProxy } from '@work-orders/common/create-purchase-order/reducer.js';
import {
  BlockStack,
  Card,
  Divider,
  InlineGrid,
  InlineStack,
  SkeletonBodyText,
  Text,
  TextField,
} from '@shopify/polaris';
import type { Location } from '@web/frontend/pages/purchase-orders/[name].js';
import { useToast } from '@teifi-digital/shopify-app-react';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { useVendorsQuery } from '@work-orders/common/queries/use-vendors-query.js';
import { useState } from 'react';
import { DateModal } from '@web/frontend/components/shared-orders/modals/DateModal.js';
import { DateTime } from '@web/schemas/generated/create-work-order.js';

const TODAY_DATE = new Date();
TODAY_DATE.setHours(0, 0, 0, 0);

export function PurchaseOrderGeneralCard({
  createPurchaseOrder,
  dispatch,
  selectedLocation,
  disabled,
  onVendorSelectorClick,
  onLocationSelectorClick,
  isLoadingLocation,
}: {
  createPurchaseOrder: CreatePurchaseOrder;
  dispatch: CreatePurchaseOrderDispatchProxy;
  selectedLocation: Location;
  disabled: boolean;
  onVendorSelectorClick: () => void;
  onLocationSelectorClick: () => void;
  isLoadingLocation: boolean;
}) {
  const [isDateModalOpen, setIsDateModalOpen] = useState(false);

  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });
  const vendorQuery = useVendorsQuery({ fetch });

  const vendor = vendorQuery.data?.find(vendor => vendor.name === createPurchaseOrder.vendorName);

  const placedDate = createPurchaseOrder.placedDate ? new Date(createPurchaseOrder.placedDate) : null;

  return (
    <>
      <Card>
        <BlockStack gap={'400'}>
          <Text as={'h2'} variant={'headingMd'} fontWeight={'bold'}>
            General
          </Text>

          <TextField
            label={'Vendor'}
            autoComplete={'off'}
            requiredIndicator
            value={createPurchaseOrder.vendorName ?? ''}
            onFocus={() => onVendorSelectorClick()}
            disabled={disabled || (!!createPurchaseOrder.name && createPurchaseOrder.vendorName !== null)}
            readOnly
          />

          {!!createPurchaseOrder.vendorName && vendorQuery.isLoading && <SkeletonBodyText />}
          {vendor?.customer && vendor.customer.metafields.nodes.length > 0 && (
            <>
              <BlockStack gap={'200'}>
                <InlineStack gap={'200'}>
                  <Text as={'p'} variant={'bodyMd'} fontWeight={'semibold'} tone={'subdued'}>
                    Vendor Metafields
                  </Text>
                </InlineStack>

                <InlineGrid gap={'200'} columns={3}>
                  {vendor.customer.metafields.nodes.map(({ definition, namespace, key, value }) => (
                    <TextField
                      key={`${namespace}.${key}`}
                      label={definition?.name ?? `${namespace}.${key}`}
                      autoComplete="off"
                      readOnly
                      value={value}
                    />
                  ))}
                </InlineGrid>
              </BlockStack>
              <Divider />
            </>
          )}

          <TextField
            label={'Location'}
            requiredIndicator
            autoComplete={'off'}
            loading={isLoadingLocation}
            value={
              isLoadingLocation
                ? ''
                : createPurchaseOrder.locationId
                  ? (selectedLocation?.name ?? 'Unknown location')
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
