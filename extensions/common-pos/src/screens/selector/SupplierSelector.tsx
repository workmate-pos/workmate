import { UseRouter } from '../router.js';
import { useDebouncedState } from '../../hooks/use-debounced-state.js';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { ReactNode, useEffect } from 'react';
import { useInfinitePagination } from '@work-orders/common/util/pagination.js';
import { SupplierList, SupplierListProps } from '../list/SupplierList.js';
import { ScrollView } from '@shopify/ui-extensions-react/point-of-sale';
import { ControlledSearchBar } from '@teifi-digital/pos-tools/components/ControlledSearchBar.js';
import { useSuppliersQuery } from '@work-orders/common/queries/use-suppliers-query.js';
import { DetailedSupplier } from '@web/services/suppliers/get.js';

export type SupplierSelectorProps = {
  header?: ReactNode;
  onSelect: (supplier: DetailedSupplier) => void;
  selectedSuppliers?: number[];
  onSelectedSuppliersChange?: (selectedSupplierIds: number[]) => void;
  useRouter: UseRouter;
  /**
   * Optional list of selected supplier ids.
   * If provided, the modal will
   */
  selectedSupplierIds?: number[];
  onSelectedSupplierIdsChange?: (supplierIds: number[]) => void;
  // TODO: Remove this and just handle it in onSelect
  closeOnSelect?: boolean;
  render?: SupplierListProps['render'];
};

export function SupplierSelector({
  useRouter,
  onSelect,
  selectedSupplierIds,
  onSelectedSupplierIdsChange,
  closeOnSelect = true,
  render,
  header,
}: SupplierSelectorProps) {
  const fetch = useAuthenticatedFetch();
  const [query, setQuery, optimisticQuery] = useDebouncedState('');
  const suppliersQuery = useSuppliersQuery({ fetch, params: { limit: 50 } });

  const { page, reset, ...pagination } = useInfinitePagination({
    pages: suppliersQuery.data?.pages ?? [],
    hasNext: suppliersQuery.hasNextPage,
    onNext: suppliersQuery.fetchNextPage,
  });

  useEffect(() => {
    reset();
  }, [query]);

  const router = useRouter();

  return (
    <ScrollView>
      {header}

      <SupplierList
        selectable={selectedSupplierIds !== undefined}
        selectedItems={selectedSupplierIds}
        onSelectionChange={onSelectedSupplierIdsChange}
        supplierIds={page?.suppliers.map(supplier => supplier.id) ?? []}
        loading={suppliersQuery.isFetching}
        pagination={pagination}
        filterControl={
          <ControlledSearchBar
            value={optimisticQuery}
            placeholder="Search suppliers"
            onSearch={() => {}}
            editable
            onTextChange={setQuery}
          />
        }
        render={render}
        onClick={supplierId => {
          const supplier = page?.suppliers.find(supplier => supplier.id === supplierId);

          if (!supplier) {
            console.error('Could not find supplier', supplierId);
            return;
          }

          onSelect(supplier);

          if (closeOnSelect) {
            router.popCurrent();
          }
        }}
      />
    </ScrollView>
  );
}
