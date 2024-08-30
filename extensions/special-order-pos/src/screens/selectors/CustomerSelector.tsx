import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { ListPopup } from '@work-orders/common-pos/screens/ListPopup.js';
import { useScreen } from '@teifi-digital/pos-tools/router';
import { useRouter } from '../../routes.js';
import { isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { Customer, useCustomersQuery } from '@work-orders/common/queries/use-customers-query.js';
import { useDebouncedState } from '@work-orders/common-pos/hooks/use-debounced-state.js';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import { getSubtitle } from '@work-orders/common-pos/util/subtitle.js';

export function CustomerSelector({
  onSelect,
  onClear,
}: {
  onSelect: (customer: Customer) => void;
  onClear?: () => void;
}) {
  const fetch = useAuthenticatedFetch();
  const [query, setQuery] = useDebouncedState('');
  const customersQuery = useCustomersQuery({ fetch, params: { query } });

  const screen = useScreen();
  screen.setIsLoading(customersQuery.isLoading);

  const customers = customersQuery.data?.pages.flat() ?? [];

  return (
    <ListPopup
      title={'Select Customer'}
      query={{ query, setQuery }}
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
