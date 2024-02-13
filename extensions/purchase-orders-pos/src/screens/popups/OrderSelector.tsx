import { ClosePopupFn, useScreen } from '@work-orders/common-pos/hooks/use-screen.js';
import { useDebouncedState } from '@work-orders/common/hooks/use-debounced-state.js';
import { useAuthenticatedFetch } from '@work-orders/common-pos/hooks/use-authenticated-fetch.js';
import { Order, useOrdersQuery } from '@work-orders/common/queries/use-orders-query.js';
import { List, ListRow, ScrollView, Stack, Text } from '@shopify/retail-ui-extensions-react';
import { ControlledSearchBar } from '@work-orders/common-pos/components/ControlledSearchBar.js';
import { extractErrorMessage } from '@work-orders/common-pos/util/errors.js';

export function OrderSelector() {
  const [query, setQuery] = useDebouncedState('');

  const { Screen, closePopup } = useScreen('OrderSelector', () => {
    setQuery('', true);
  });

  const fetch = useAuthenticatedFetch();
  const ordersQuery = useOrdersQuery({ fetch, params: { query } });
  const orders = ordersQuery.data?.pages ?? [];

  // TODO: Order preview just like work orders? -> shared screens?

  const rows = getOrderRows(orders, closePopup);

  return (
    <Screen title={'Select Order'} presentation={{ sheet: true }}>
      <ScrollView>
        <Stack direction="horizontal" alignment="center" flex={1} paddingHorizontal={'HalfPoint'}>
          <Text variant="body" color="TextSubdued">
            {ordersQuery.isRefetching ? 'Reloading...' : ' '}
          </Text>
        </Stack>
        <ControlledSearchBar
          value={query}
          onTextChange={(query: string) => setQuery(query, query === '')}
          onSearch={() => {}}
          placeholder="Search orders"
        />
        <List data={rows} isLoadingMore={ordersQuery.isLoading} onEndReached={() => ordersQuery.fetchNextPage()} />
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
    </Screen>
  );
}

function getOrderRows(orders: Order[], closePopup: ClosePopupFn<'OrderSelector'>) {
  return orders.map<ListRow>(({ id, name, workOrderName, customer }) => {
    const label = workOrderName ? `${name} (${workOrderName})` : name;

    return {
      id,
      onPress: () => {
        closePopup({
          orderId: id,
          orderName: name,
          customerId: customer?.id ?? null,
          customerName: customer?.displayName ?? null,
        });
      },
      leftSide: {
        label,
        subtitle: [customer?.displayName ?? 'No customer'],
      },
    };
  });
}
