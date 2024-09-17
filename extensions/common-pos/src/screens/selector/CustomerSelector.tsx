import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { Customer, useCustomersQuery } from '@work-orders/common/queries/use-customers-query.js';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import { useDebouncedState } from '../../hooks/use-debounced-state.js';
import { UseRouter } from '../router.js';
import { ListPopup } from '../ListPopup.js';
import { getSubtitle } from '../../util/subtitle.js';

export type CustomerSelectorProps = {
  onSelect: (customer: Customer) => void;
  onClear?: () => void;
  useRouter: UseRouter;
};

export function CustomerSelector({ onSelect, onClear, useRouter }: CustomerSelectorProps) {
  const fetch = useAuthenticatedFetch();
  const [query, setQuery] = useDebouncedState('');
  const customersQuery = useCustomersQuery({ fetch, params: { query } });

  const customers = customersQuery.data?.pages.flat() ?? [];

  return (
    <ListPopup
      title={'Select Customer'}
      query={{ query, setQuery }}
      resourceName={{ singular: 'customer', plural: 'customers' }}
      isLoadingMore={customersQuery.isFetching}
      onEndReached={() => customersQuery.fetchNextPage()}
      selection={{
        type: 'select',
        items: [
          onClear ? { id: '', leftSide: { label: 'Clear' } } : null,
          ...customers.map(customer => ({
            id: customer.id,
            leftSide: {
              label: customer.displayName,
              subtitle: getSubtitle([customer.email, customer.phone]),
            },
          })),
        ].filter(isNonNullable),
        onSelect: customerId =>
          customerId === '' ? onClear?.() : onSelect(customers.find(customer => customer.id === customerId) ?? never()),
      }}
      useRouter={useRouter}
    />
  );
}
