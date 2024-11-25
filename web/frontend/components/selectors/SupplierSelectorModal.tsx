import { useToast } from '@teifi-digital/shopify-app-react';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { useEffect } from 'react';
import { Filters, Modal } from '@shopify/polaris';
import { SupplierResourceList } from '@web/frontend/components/SupplierResourceList.js';
import { useSuppliersQuery } from '@work-orders/common/queries/use-suppliers-query.js';
import { useDebouncedState } from '@web/frontend/hooks/use-debounced-state.js';
import { useInfinitePagination } from '@work-orders/common/util/pagination.js';
import { DetailedSupplier } from '@web/services/suppliers/get.js';

const PAGE_SIZE = 50;

export type SupplierSelectorModalProps = {
  onSelect: (supplier: DetailedSupplier) => void;
  open: boolean;
  onClose: () => void;
  selectedSuppliers?: number[];
  onSelectedSuppliersChange?: (selectedSupplierIds: number[]) => void;
};

export function SupplierSelectorModal({
  onSelect,
  open,
  onClose,
  selectedSuppliers,
  onSelectedSuppliersChange,
}: SupplierSelectorModalProps) {
  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });

  const [query, setQuery, optimisticQuery] = useDebouncedState('');

  const suppliersQuery = useSuppliersQuery({
    fetch,
    params: {
      limit: PAGE_SIZE,
      query,
    },
  });

  const { page, reset, ...pagination } = useInfinitePagination({
    pages: suppliersQuery.data?.pages ?? [],
    hasNext: suppliersQuery.hasNextPage,
    onNext: suppliersQuery.fetchNextPage,
  });

  useEffect(() => {
    reset();
  }, [query]);

  return (
    <>
      <Modal open={open} title="Suppliers" onClose={onClose} loading={suppliersQuery.isLoading}>
        <SupplierResourceList
          supplierIds={page?.suppliers.map(supplier => supplier.id) ?? []}
          selectable={selectedSuppliers !== undefined}
          selectedItems={selectedSuppliers}
          onSelectionChange={onSelectedSuppliersChange}
          pagination={pagination}
          filterControl={
            <Filters
              queryPlaceholder="Search suppliers"
              queryValue={optimisticQuery}
              filters={[]}
              onQueryChange={query => setQuery(query, !query)}
              onQueryClear={() => setQuery('', true)}
              onClearAll={() => setQuery('', true)}
            />
          }
          onClick={supplierId => {
            const supplier = page?.suppliers.find(supplier => supplier.id === supplierId);

            if (!supplier) {
              console.error('Could not find supplier', supplierId);
              return;
            }

            onSelect(supplier);
          }}
        />
      </Modal>

      {toast}
    </>
  );
}
