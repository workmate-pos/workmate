import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { useVendorsQuery } from '@work-orders/common/queries/use-vendors-query.js';
import { useState } from 'react';
import { isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { UseRouter } from '../router.js';
import { ListPopup } from '../ListPopup.js';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { useSuppliersQuery } from '@work-orders/common/queries/use-suppliers-query.js';
import { useDebouncedState } from '../../hooks/use-debounced-state.js';
import { getSubtitle } from '../../util/subtitle.js';
import { DetailedSupplier } from '@web/services/suppliers/get.js';

export type NotFullyOrderedSpecialOrderSupplierSelectorProps = {
  locationId: ID;
  onSelect: (supplier: DetailedSupplier) => void;
  onClear?: () => void;
  useRouter: UseRouter;
};

export function NotFullyOrderedSpecialOrderSupplierSelector({
  locationId,
  onSelect,
  onClear,
  useRouter,
}: NotFullyOrderedSpecialOrderSupplierSelectorProps) {
  const fetch = useAuthenticatedFetch();
  const [query, setQuery, optimisticQuery] = useDebouncedState('');

  const vendorsQuery = useVendorsQuery({
    fetch,
    filters: {
      specialOrderLocationId: locationId,
      specialOrderLineItemOrderState: 'not-fully-ordered',
    },
  });

  const vendors = vendorsQuery.data?.map(vendor => vendor.name) ?? [];

  const suppliersQuery = useSuppliersQuery({
    fetch,
    params: {
      limit: 100,
      vendor: vendors,
      query,
    },
  });

  const [pageNumber, setPageNumber] = useState(1);
  const page = suppliersQuery.data?.pages[pageNumber - 1]?.suppliers ?? [];

  return (
    <ListPopup
      title={'Select vendor'}
      query={{ query: optimisticQuery, setQuery }}
      resourceName={{ singular: 'vendor', plural: 'vendors' }}
      isLoadingMore={vendorsQuery.isFetching}
      selection={{
        type: 'select',
        items: [
          onClear ? { id: '', leftSide: { label: 'Clear' } } : null,
          ...page.map(supplier => getSupplierItem(supplier)),
        ].filter(isNonNullable),
        onSelect: supplierId => {
          if (supplierId === '') {
            onClear?.();
            return;
          }

          const supplier = page.find(supplier => getSupplierItem(supplier).id === supplierId);

          if (!supplier) {
            return;
          }

          onSelect(supplier);
        },
      }}
      useRouter={useRouter}
      pagination={{
        hasNextPage: suppliersQuery.hasNextPage,
        pageCount: suppliersQuery.data?.pages.length ?? 0,
        onFetchNextPage: suppliersQuery.fetchNextPage,
        onPageChange: setPageNumber,
        page: pageNumber,
      }}
    />
  );
}

function getSupplierItem(supplier: DetailedSupplier) {
  return {
    id: String(supplier.id),
    leftSide: {
      label: supplier.name,
      subtitle: getSubtitle([`${supplier.vendors.length} vendors`]),
    },
  };
}
