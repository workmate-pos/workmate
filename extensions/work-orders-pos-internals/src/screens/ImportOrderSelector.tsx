import { List, ListRow, ScrollView, Stack, Text } from '@shopify/retail-ui-extensions-react';
import { Order, useOrdersQuery } from '@work-orders/common/queries/use-orders-query.js';
import {
  getFinancialStatusBadgeStatus,
  getFinancialStatusBadgeVariant,
  getFulfillmentStatusBadgeStatus,
  getFulfillmentStatusBadgeVariant,
  getStatusText,
} from '../util/badges.js';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { ControlledSearchBar } from '@teifi-digital/pos-tools/components/ControlledSearchBar.js';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { useRouter } from '../routes.js';
import { useDebouncedState } from '@work-orders/common-pos/hooks/use-debounced-state.js';

export function ImportOrderSelector() {
  const [query, setQuery] = useDebouncedState('');

  const fetch = useAuthenticatedFetch();
  const ordersQuery = useOrdersQuery({ fetch, params: { query } });

  const rows = getOrderRows(ordersQuery.data?.pages.flat() ?? []);

  return (
    <ScrollView>
      <Stack direction="horizontal" alignment="center" flex={1} paddingHorizontal={'HalfPoint'}>
        <Text variant="body" color="TextSubdued">
          {ordersQuery.isRefetching ? 'Reloading...' : ' '}
        </Text>
      </Stack>
      <ControlledSearchBar
        value={query}
        onTextChange={(query: string) => {
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
            {extractErrorMessage(ordersQuery.error, 'Error loading orders')}
          </Text>
        </Stack>
      )}
    </ScrollView>
  );
}

function getOrderRows(orders: Order[]) {
  const router = useRouter();

  return orders.map<ListRow>(({ id, name, workOrders, displayFulfillmentStatus, displayFinancialStatus, customer }) => {
    let label = name;

    const workOrderNames = workOrders.map(workOrder => workOrder.name).join(' • ');
    if (workOrderNames) {
      label += ` (${workOrderNames})`;
    }

    return {
      id,
      onPress: () => router.push('OrderPreview', { orderId: id, unsavedChanges: false, showImportButton: true }),
      leftSide: {
        label,
        badges: displayFinancialStatus
          ? [
              {
                text: getStatusText(displayFinancialStatus),
                variant: getFinancialStatusBadgeVariant(displayFinancialStatus),
                status: getFinancialStatusBadgeStatus(displayFinancialStatus),
              },
              {
                text: getStatusText(displayFulfillmentStatus),
                variant: getFulfillmentStatusBadgeVariant(displayFulfillmentStatus),
                status: getFulfillmentStatusBadgeStatus(displayFulfillmentStatus),
              },
            ]
          : undefined,
        subtitle: [customer?.displayName ?? 'No customer'],
      },
    };
  });
}
