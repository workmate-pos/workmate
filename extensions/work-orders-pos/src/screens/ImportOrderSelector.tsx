import { NavigateFn, useScreen } from '../hooks/use-screen';
import { Order, useOrdersQuery } from '@common/queries/use-orders-query';
import { List, ListRow, ScrollView, SearchBar, Stack, Text } from '@shopify/retail-ui-extensions-react';
import { useDebouncedState } from '@common/hooks/use-debounced-state';
import { titleCase } from '@common/util/casing';
import { useAuthenticatedFetch } from '../hooks/use-authenticated-fetch';

export function ImportOrderSelector() {
  const { Screen, navigate } = useScreen('ImportOrderSelector');
  const [query, setQuery] = useDebouncedState('');

  const fetch = useAuthenticatedFetch();
  const ordersQuery = useOrdersQuery({ fetch, query });

  const rows = getOrderRows(ordersQuery.data?.pages ?? [], navigate);

  return (
    <Screen title={'Import Order'} onNavigate={() => setQuery('', true)}>
      <ScrollView>
        <Stack direction="horizontal" alignment="center" flex={1} paddingHorizontal={'HalfPoint'}>
          <Text variant="body" color="TextSubdued">
            {ordersQuery.isRefetching ? 'Reloading...' : ' '}
          </Text>
        </Stack>
        <SearchBar
          onTextChange={query => {
            setQuery(query, query === '');
          }}
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
              Error loading orders
            </Text>
          </Stack>
        )}
      </ScrollView>
    </Screen>
  );
}

function getOrderRows(orders: Order[], navigate: NavigateFn) {
  return orders.map<ListRow>(
    ({ id, name, customer, displayFinancialStatus, displayFulfillmentStatus, workOrderName }) => {
      const label = workOrderName ? `${name} (${workOrderName})` : name;

      return {
        id,
        onPress: () => {
          navigate('WorkOrder', {
            type: 'new-work-order',
            initial: {
              customer: customer ? { id: customer.id, name: customer.displayName } : undefined,
              derivedFromOrder: {
                id,
                workOrderName,
                name,
              },
            },
          });
        },
        leftSide: {
          label,
          badges: displayFinancialStatus
            ? [
                {
                  text: titleCase(displayFinancialStatus.replace('_', ' ')),
                  variant: (
                    {
                      PENDING: 'neutral',
                      AUTHORIZED: 'neutral',
                      EXPIRED: 'neutral',
                      PAID: 'neutral',
                      PARTIALLY_PAID: 'warning',
                      PARTIALLY_REFUNDED: 'neutral',
                      REFUNDED: 'neutral',
                      VOIDED: 'neutral',
                    } as const
                  )[displayFinancialStatus],
                  status: (
                    {
                      PENDING: 'empty',
                      AUTHORIZED: 'empty',
                      EXPIRED: 'empty',
                      PAID: 'complete',
                      PARTIALLY_PAID: 'partial',
                      PARTIALLY_REFUNDED: 'complete',
                      REFUNDED: 'complete',
                      VOIDED: 'complete',
                    } as const
                  )[displayFinancialStatus],
                },
                {
                  text: titleCase(displayFulfillmentStatus.replace('_', ' ')),
                  variant: (
                    {
                      UNFULFILLED: 'neutral',
                      PARTIALLY_FULFILLED: 'neutral',
                      FULFILLED: 'neutral',
                      RESTOCKED: 'neutral',
                      PENDING_FULFILLMENT: 'neutral',
                      OPEN: 'neutral',
                      IN_PROGRESS: 'neutral',
                      ON_HOLD: 'neutral',
                      SCHEDULED: 'neutral',
                    } as const
                  )[displayFulfillmentStatus],
                  status: (
                    {
                      UNFULFILLED: 'empty',
                      PARTIALLY_FULFILLED: 'partial',
                      FULFILLED: 'complete',
                      RESTOCKED: 'empty',
                      PENDING_FULFILLMENT: 'empty',
                      OPEN: 'empty',
                      IN_PROGRESS: 'empty',
                      ON_HOLD: 'empty',
                      SCHEDULED: 'empty',
                    } as const
                  )[displayFulfillmentStatus],
                },
              ]
            : undefined,
          subtitle: [customer?.displayName ?? 'No customer'],
        },
      };
    },
  );
}
