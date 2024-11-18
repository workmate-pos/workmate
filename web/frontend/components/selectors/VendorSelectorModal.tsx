import { useToast } from '@teifi-digital/shopify-app-react';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { useVendorsQuery } from '@work-orders/common/queries/use-vendors-query.js';
import { useEffect, useState } from 'react';
import { useStaticPagination } from '@web/frontend/hooks/pagination.js';
import { Filters, Modal } from '@shopify/polaris';
import { VendorResourceList } from '@web/frontend/components/VendorResourceList.js';

const PAGE_SIZE = 50;

export type VendorSelectorModalProps = {
  onSelect: (vendor: string) => void;
  open: boolean;
  onClose: () => void;
  selectedVendors?: string[];
  onSelectedVendorsChange?: (selectedVendors: string[]) => void;
};

export function VendorSelectorModal({
  onSelect,
  open,
  onClose,
  selectedVendors,
  onSelectedVendorsChange,
}: VendorSelectorModalProps) {
  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });
  const vendorsQuery = useVendorsQuery({ fetch });

  const [query, setQuery] = useState('');

  const { page, reset, ...pagination } = useStaticPagination(vendorsQuery.data ?? [], PAGE_SIZE);

  useEffect(() => {
    reset();
  }, [query]);

  return (
    <>
      <Modal open={open} title="Vendors" onClose={onClose} loading={vendorsQuery.isLoading}>
        <VendorResourceList
          vendors={
            page
              .map(vendor => vendor.name)
              .filter(vendor => !query || vendor.toLowerCase().includes(query.toLowerCase())) ?? []
          }
          selectable={selectedVendors !== undefined}
          selectedItems={selectedVendors}
          onSelectionChange={onSelectedVendorsChange}
          pagination={pagination}
          filterControl={
            <Filters
              queryPlaceholder="Search vendors"
              queryValue={query}
              filters={[]}
              onQueryChange={query => setQuery(query)}
              onQueryClear={() => setQuery('')}
              onClearAll={() => setQuery('')}
            />
          }
          onClick={vendor => onSelect(vendor)}
        />
      </Modal>

      {toast}
    </>
  );
}
