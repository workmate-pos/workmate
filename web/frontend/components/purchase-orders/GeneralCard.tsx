import { CreatePurchaseOrder } from '@web/schemas/generated/create-purchase-order.js';
import { CreatePurchaseOrderDispatchProxy } from '@work-orders/common/create-purchase-order/reducer.js';
import { BlockStack, Card, InlineGrid, InlineStack, SkeletonBodyText, Text, TextField } from '@shopify/polaris';
import type { Location } from '@web/frontend/pages/purchase-orders/[name].js';
import { useToast } from '@teifi-digital/shopify-app-react';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { useCustomerQuery } from '@work-orders/common/queries/use-customer-query.js';
import { useVendorsQuery } from '@work-orders/common/queries/use-vendors-query.js';

export function GeneralCard({
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
  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });
  const vendorQuery = useVendorsQuery({ fetch });

  const vendor = vendorQuery.data?.find(vendor => vendor.name === createPurchaseOrder.vendorName);

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

          {vendorQuery.isLoading && <SkeletonBodyText />}
          {vendor?.customer && vendor.customer.metafields.nodes.length > 0 && (
            <BlockStack gap={'200'}>
              <InlineStack gap={'200'}>
                <Text as={'p'} variant={'bodyMd'} fontWeight={'semibold'} tone={'subdued'}>
                  Vendor Metafields
                </Text>
              </InlineStack>

              <InlineGrid gap={'200'} columns={3}>
                {vendor.customer.metafields.nodes.map(({ definition, namespace, key, value }) => (
                  <TextField
                    label={definition?.name ?? `${namespace}.${key}`}
                    autoComplete="off"
                    readOnly
                    value={value}
                  />
                ))}
              </InlineGrid>
            </BlockStack>
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
                  ? selectedLocation?.name ?? 'Unknown location'
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
        </BlockStack>
      </Card>

      {toast}
    </>
  );
}
