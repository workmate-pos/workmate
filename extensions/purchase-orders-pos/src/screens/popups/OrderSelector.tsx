import { List, ListRow, ScrollView, Stack, Text } from '@shopify/retail-ui-extensions-react';
import { Order, useOrdersQuery } from '@work-orders/common/queries/use-orders-query.js';
import { Int } from '@web/schemas/generated/create-product.js';
import { ControlledSearchBar } from '@teifi-digital/pos-tools/components/ControlledSearchBar.js';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { extractErrorMessage } from '@teifi-digital/pos-tools/utils/errors.js';
import { useCurrencyFormatter } from '@work-orders/common-pos/hooks/use-currency-formatter.js';
import { useRouter } from '../../routes.js';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { useDebouncedState } from '@work-orders/common-pos/hooks/use-debounced-state.js';

// TODO: Also support draft orders
export function OrderSelector({ onSelect }: { onSelect: (orderId: ID) => void }) {
  const [query, setQuery] = useDebouncedState('');

  const fetch = useAuthenticatedFetch();

  const ordersQuery = useOrdersQuery({ fetch, params: { query, first: 25 as Int } });
  const orders = ordersQuery.data?.pages.flat() ?? [];

  const rows = useOrderRows(orders, onSelect);

  return (
    <ScrollView>
      <Stack direction="horizontal" alignment="center" flex={1} paddingHorizontal={'HalfPoint'}>
        <Text variant="body" color="TextSubdued">
          {ordersQuery.isRefetching ? 'Reloading...' : ' '}
        </Text>
      </Stack>
      <ControlledSearchBar
        value={query}
        onTextChange={(query: string) => setQuery(query, !query)}
        onSearch={() => {}}
        placeholder={'Search orders'}
      />
      <List
        data={rows}
        onEndReached={ordersQuery.fetchNextPage}
        isLoadingMore={ordersQuery.isLoading}
        imageDisplayStrategy={'always'}
      />
      {ordersQuery.isLoading && (
        <Stack direction="horizontal" alignment="center" flex={1} paddingVertical="ExtraLarge">
          <Text variant="body" color="TextSubdued">
            Loading orders...
          </Text>
        </Stack>
      )}
      {ordersQuery.isSuccess && rows.length === 0 && (
        <Stack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
          <Text variant="body" color="TextSubdued">
            No orders found
          </Text>
        </Stack>
      )}
      {ordersQuery.isError && (
        <Stack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
          <Text color="TextCritical" variant="body">
            {extractErrorMessage(ordersQuery.error, 'Error loading orders')}
          </Text>
        </Stack>
      )}
    </ScrollView>
  );
}

function useOrderRows(orders: Order[], onSelect: (orderId: ID) => void) {
  const currencyFormatter = useCurrencyFormatter();
  const router = useRouter();

  return orders.map<ListRow>(order => {
    return {
      id: order.id,
      onPress: async () => {
        await router.popCurrent();
        onSelect(order.id);
      },
      leftSide: {
        label: order.name,
        subtitle: order.customer
          ? [
              `Paid ${currencyFormatter(order.received)}`,
              `Total ${currencyFormatter(order.total)}`,
              order.customer.displayName,
            ]
          : [`Paid ${currencyFormatter(order.received)}`, `Total ${currencyFormatter(order.total)}`],
      },
      rightSide: { showChevron: true },
    };
  });
}
