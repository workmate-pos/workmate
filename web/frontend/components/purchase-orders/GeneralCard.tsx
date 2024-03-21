import { CreatePurchaseOrder } from '@web/schemas/generated/create-purchase-order.js';
import { CreatePurchaseOrderDispatchProxy } from '@work-orders/common/create-purchase-order/reducer.js';
import { BlockStack, Card, Text, TextField } from '@shopify/polaris';
import type { Location } from '@web/frontend/pages/purchase-orders/[name].js';

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
  return (
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
          disabled={disabled}
          readOnly
        />
        <TextField
          label={'Location'}
          requiredIndicator
          autoComplete={'off'}
          loading={isLoadingLocation}
          value={
            isLoadingLocation ? '' : createPurchaseOrder.locationId ? selectedLocation?.name ?? 'Unknown location' : ''
          }
          onFocus={() => onLocationSelectorClick()}
          multiline
          disabled={disabled}
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
  );
}
