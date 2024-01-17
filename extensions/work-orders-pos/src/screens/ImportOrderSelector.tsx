import { List, ListRow, ScrollView, Stack, Text } from '@shopify/retail-ui-extensions-react';
import { Order, useOrdersQuery } from '@work-orders/common/queries/use-orders-query.js';
import { useDebouncedState } from '@work-orders/common/hooks/use-debounced-state.js';
import type { ID } from '@web/schemas/generated/ids.js';
import { useScreen } from '../hooks/use-screen.js';
import { useAuthenticatedFetch } from '../hooks/use-authenticated-fetch.js';
import {
  getFinancialStatusBadgeStatus,
  getFinancialStatusBadgeVariant,
  getFulfillmentStatusBadgeStatus,
  getFulfillmentStatusBadgeVariant,
  getStatusText,
} from '../util/badges.js';
import { ControlledSearchBar } from '../components/ControlledSearchBar.js';

export function ImportOrderSelector() {
  const { Screen, usePopup } = useScreen('ImportOrderSelector');
  const [query, setQuery] = useDebouncedState('');

  const fetch = useAuthenticatedFetch();
  const ordersQuery = useOrdersQuery({ fetch, params: { query } });

  const orderPreviewPopup = usePopup('OrderPreview');

  const showOrderPreview = (orderId: ID) =>
    orderPreviewPopup.navigate({ orderId, unsavedChanges: false, showImportButton: true });

  const rows = getOrderRows(ordersQuery.data?.pages ?? [], showOrderPreview);

  return (
    <Screen title={'Import Order'}>
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
              Error loading orders
            </Text>
          </Stack>
        )}
      </ScrollView>
    </Screen>
  );
}

function getOrderRows(orders: Order[], showOrderPreview: (orderId: ID) => void) {
  return orders.map<ListRow>(
    ({ id, name, workOrderName, displayFulfillmentStatus, displayFinancialStatus, customer }) => {
      const label = workOrderName ? `${name} (${workOrderName})` : name;

      return {
        id,
        onPress: () => {
          showOrderPreview(id);
        },
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
    },
  );
}
