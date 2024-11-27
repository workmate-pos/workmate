import {
  Banner,
  Filters,
  InlineStack,
  Modal,
  ResourceItem,
  ResourceList,
  Spinner,
  Text,
  TextField,
} from '@shopify/polaris';
import { useToast } from '@teifi-digital/shopify-app-react';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { useDebouncedState } from '@web/frontend/hooks/use-debounced-state.js';
import { useVendorsQuery } from '@work-orders/common/queries/use-vendors-query.js';
import { useState } from 'react';
import { useSupplierMutation } from '@work-orders/common/queries/use-supplier-mutation.js';
import { useAppBridge } from '@shopify/app-bridge-react';

/**
 * Convert a Shopify vendor into a WorkMate supplier.
 * This modal shows all vendors with no matching supplier name, making it easy to migrate from vendors to suppliers.
 */
export function ImportVendorModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });

  const [query, setQuery] = useDebouncedState('');
  const vendorsQuery = useVendorsQuery({ fetch });
  const vendors = vendorsQuery.data ?? [];

  const filteredVendors = vendors.filter(
    vendor =>
      vendor.name.toLowerCase().includes(query.toLowerCase()) ||
      vendor.customer?.defaultAddress?.formatted?.join(' ').toLowerCase().includes(query.toLowerCase()),
  );

  const [selectedVendorName, setSelectedVendorName] = useState<string>();

  return (
    <>
      <Modal open={open && !selectedVendorName} title={'Import vendor'} onClose={onClose}>
        <Modal.Section>
          <Text as="p" variant="bodyMd">
            Select a vendor to create a supplier that can supply all of its products.
          </Text>
        </Modal.Section>

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
            <VendorResourceItem
              name={vendor.name}
              key={vendor.name}
              onClick={() => setSelectedVendorName(vendor.name)}
            />
          )}
        />
      </Modal>

      {selectedVendorName && (
        <ImportVendorDetailsModal name={selectedVendorName} open onClose={() => setSelectedVendorName(undefined)} />
      )}

      {toast}
    </>
  );
}

function VendorResourceItem({ name, onClick }: { name: string; onClick: () => void }) {
  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });
  const vendorsQuery = useVendorsQuery({ fetch });

  const vendorNotFound = (
    <ResourceItem id={name} disabled onClick={() => {}}>
      <Banner
        tone="critical"
        title="Vendor not found"
        action={{
          content: 'Try again',
          onAction: () => vendorsQuery.refetch(),
        }}
      >
        Could not find vendor {name}
      </Banner>

      {toast}
    </ResourceItem>
  );

  if (vendorsQuery.isError) {
    return vendorNotFound;
  }

  if (!vendorsQuery.data) {
    return (
      <ResourceItem id={name} disabled onClick={() => {}}>
        <InlineStack align="center" blockAlign="center">
          <Spinner />
        </InlineStack>

        {toast}
      </ResourceItem>
    );
  }

  const vendor = vendorsQuery.data.find(v => v.name === name);

  if (!vendor) {
    return vendorNotFound;
  }

  return (
    <ResourceItem id={name} onClick={onClick}>
      <Text as={'p'} variant={'bodyMd'} fontWeight={'bold'}>
        {vendor.name}
      </Text>

      {toast}
    </ResourceItem>
  );
}

function ImportVendorDetailsModal({ name, open, onClose }: { name: string; open: boolean; onClose: () => void }) {
  const app = useAppBridge();

  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });

  const supplierMutation = useSupplierMutation({ fetch });

  const [supplierName, setSupplierName] = useState(name);

  return (
    <>
      <Modal
        open={open}
        title={'Import vendor'}
        onClose={onClose}
        primaryAction={{
          content: 'Import',
          loading: supplierMutation.isPending,
          disabled: !supplierName,
          onAction: () => {
            supplierMutation.mutate(
              { id: null, name: supplierName, address: '', vendors: [name] },
              {
                onSuccess() {
                  setToastAction({ content: 'Created supplier!' });
                },
              },
            );
          },
        }}
      >
        <Modal.Section>
          <TextField label="Supplier name" autoComplete="off" value={supplierName} onChange={setSupplierName} />
        </Modal.Section>
      </Modal>

      {toast}
    </>
  );
}
