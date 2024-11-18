import { ToastActionCallable } from '@teifi-digital/shopify-app-react';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { useVendorsQuery } from '@work-orders/common/queries/use-vendors-query.js';
import { Filters, InlineStack, Modal, ResourceItem, ResourceList, Text } from '@shopify/polaris';
import { useState } from 'react';

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
  const [query, setQuery] = useState('');
  const fetch = useAuthenticatedFetch({ setToastAction });
  const vendorsQuery = useVendorsQuery({ fetch });
  const vendors = vendorsQuery.data ?? [];

  const filteredVendors = vendors.filter(
    vendor =>
      vendor.name.toLowerCase().includes(query.toLowerCase()) ||
      vendor.customer?.defaultAddress?.formatted?.join(' ').toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <Modal open={open} title={'Select vendor'} onClose={onClose}>
      <ResourceList
        items={filteredVendors}
        resourceName={{ singular: 'vendor', plural: 'vendors' }}
        resolveItemId={vendor => vendor.name}
        filterControl={
          <Filters
            filters={[]}
            appliedFilters={[]}
            loading={vendorsQuery.isLoading}
            queryValue={query}
            queryPlaceholder={'Search vendors'}
            onQueryChange={query => setQuery(query)}
            onQueryClear={() => setQuery('')}
            onClearAll={() => setQuery('')}
          />
        }
        loading={vendorsQuery.isLoading}
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
            {vendor.customer?.metafields.nodes.map(({ definition, namespace, key, value }) => (
              <InlineStack key={`${namespace}.${key}`} gap="200">
                <Text as={'p'} variant={'bodyMd'} fontWeight={'semibold'} tone={'subdued'}>
                  {definition?.name ?? `${namespace}.${key}`}
                </Text>
                <Text as={'p'} variant={'bodyMd'} tone={'subdued'}>
                  {value}
                </Text>
              </InlineStack>
            ))}
          </ResourceItem>
        )}
      />
    </Modal>
  );
}
