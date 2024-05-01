import { ToastActionCallable } from '@teifi-digital/shopify-app-react';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { useVendorsQuery } from '@work-orders/common/queries/use-vendors-query.js';
import { Modal, ResourceItem, ResourceList, Text } from '@shopify/polaris';

export function VendorSelectorModal({
  open,
  onClose,
  onSelect,
  setToastAction,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (vendorName: string) => void;
  setToastAction: ToastActionCallable;
}) {
  const fetch = useAuthenticatedFetch({ setToastAction });
  const vendorsQuery = useVendorsQuery({ fetch });
  const vendors = vendorsQuery.data ?? [];

  return (
    <Modal open={open} title={'Select Vendor'} onClose={onClose}>
      <ResourceList
        items={vendors}
        resourceName={{ singular: 'vendor', plural: 'vendors' }}
        resolveItemId={vendor => vendor.name}
        renderItem={vendor => (
          <ResourceItem
            id={vendor.name}
            onClick={() => {
              onSelect(vendor.name);
              onClose();
            }}
          >
            <Text as={'p'} variant={'bodyMd'} fontWeight={'bold'}>
              {vendor.name}
            </Text>
            <Text as={'p'} variant={'bodyMd'} tone={'subdued'}>
              {vendor.customer?.defaultAddress?.formatted?.join(', ')}
            </Text>
          </ResourceItem>
        )}
        loading={vendorsQuery.isLoading}
      />
    </Modal>
  );
}
