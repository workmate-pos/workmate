import { List, ListRow, ScrollView, SegmentedControl, Stack, Text } from '@shopify/retail-ui-extensions-react';
import { Order, useOrdersQuery } from '@work-orders/common/queries/use-orders-query.js';
import { Int } from '@web/schemas/generated/create-product.js';
import { ControlledSearchBar } from '@teifi-digital/pos-tools/components/ControlledSearchBar.js';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { useRouter } from '../../routes.js';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { useDebouncedState } from '@work-orders/common-pos/hooks/use-debounced-state.js';
import { useState } from 'react';
import { DraftOrder, useDraftOrdersQuery } from '@work-orders/common/queries/use-draft-orders-query.js';

type OrderTypeSegment = 'Orders' | 'Draft Orders';

const orderTypeSegments: OrderTypeSegment[] = ['Orders', 'Draft Orders'];

export function OrderSelector({ onSelect }: { onSelect: (orderId: ID) => void }) {
  const [query, setQuery] = useDebouncedState('');

  const fetch = useAuthenticatedFetch();

  const [orderType, setOrderType] = useState<OrderTypeSegment>('Orders');

  const ordersQuery = useOrdersQuery({ fetch, params: { query, first: 25 as Int } });
  const orders = ordersQuery.data?.pages.flat() ?? [];

  const draftOrdersQuery = useDraftOrdersQuery({ fetch, params: { query, first: 25 as Int } });
  const draftOrders = draftOrdersQuery.data?.pages.flat() ?? [];

  const currentOrders = orderType === 'Orders' ? orders : draftOrders;

  const rows = useOrderRows(currentOrders, onSelect);

  return (
    <ScrollView>
      <Stack direction="horizontal" alignment="center" flex={1} paddingHorizontal={'HalfPoint'}>
        <Text variant="body" color="TextSubdued">
          {ordersQuery.isRefetching ? 'Reloading...' : ' '}
        </Text>
      </Stack>
      <SegmentedControl
        segments={orderTypeSegments.map(segment => ({ id: segment, label: segment, disabled: false }))}
        onSelect={(orderType: OrderTypeSegment) => setOrderType(orderType)}
        selected={orderType}
      />
      <ControlledSearchBar
        value={query}
        onTextChange={(query: string) => setQuery(query, !query)}
        onSearch={() => {}}
        placeholder={'Search orders'}
      />
      <List
        data={rows}
        onEndReached={() => {
          if (orderType === 'Draft Orders') {
            draftOrdersQuery.fetchNextPage();
          } else if (orderType === 'Orders') {
            ordersQuery.fetchNextPage();
          } else {
            return orderType satisfies never;
          }
        }}
        isLoadingMore={(() => {
          if (orderType === 'Draft Orders') {
            return draftOrdersQuery.isFetchingNextPage;
          } else if (orderType === 'Orders') {
            return ordersQuery.isFetchingNextPage;
          } else {
            return orderType satisfies never;
          }
        })()}
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

function useOrderRows(orders: (Order | DraftOrder)[], onSelect: (orderId: ID) => void) {
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
        subtitle: order.customer ? [order.customer.displayName] : undefined,
      },
      rightSide: { showChevron: true },
    };
  });
}
