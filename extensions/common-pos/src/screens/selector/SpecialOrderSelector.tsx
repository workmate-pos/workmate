import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { useSpecialOrdersQuery } from '@work-orders/common/queries/use-special-orders-query.js';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import { useDebouncedState } from '../../hooks/use-debounced-state.js';
import { UseRouter } from '../router.js';
import { ListPopup } from '../ListPopup.js';
import { DetailedSpecialOrder } from '@web/services/special-orders/types.js';
import { SpecialOrderPaginationOptions } from '@web/schemas/generated/special-order-pagination-options.js';
import { getDetailedSpecialOrderBadges, getDetailedSpecialOrderSubtitle } from '../../util/special-orders.js';

export type SpecialOrderSelectorProps = {
  onSelect: (specialOrder: DetailedSpecialOrder) => void;
  onClear?: () => void;
  useRouter: UseRouter;
  filters?: Partial<Omit<SpecialOrderPaginationOptions, 'offset'>>;
};

export function SpecialOrderSelector({ onSelect, onClear, useRouter, filters }: SpecialOrderSelectorProps) {
  const fetch = useAuthenticatedFetch();
  const [query, setQuery] = useDebouncedState('');
  const specialOrdersQuery = useSpecialOrdersQuery({
    fetch,
    params: {
      query,
      limit: 25,
      ...filters,
    },
  });

  const specialOrders = specialOrdersQuery.data?.pages.flat() ?? [];

  return (
    <ListPopup
      title={'Select Special Order'}
      query={filters?.query ? undefined : { query, setQuery }}
      isLoadingMore={specialOrdersQuery.isFetching}
      resourceName={{ singular: 'special order', plural: 'special orders' }}
      onEndReached={() => specialOrdersQuery.fetchNextPage()}
      selection={{
        type: 'select',
        items: [
          onClear ? { id: '', leftSide: { label: 'Clear' } } : null,
          ...specialOrders.map(specialOrder => ({
            id: specialOrder.name,
            leftSide: {
              label: specialOrder.name,
              subtitle: getDetailedSpecialOrderSubtitle(specialOrder),
              badges: getDetailedSpecialOrderBadges(specialOrder),
            },
          })),
        ].filter(isNonNullable),
        onSelect: specialOrderName =>
          specialOrderName === ''
            ? onClear?.()
            : onSelect(specialOrders.find(specialOrder => specialOrder.name === specialOrderName) ?? never()),
      }}
      useRouter={useRouter}
    />
  );
}
