import { ClosePopupFn, useScreen } from '@work-orders/common-pos/hooks/use-screen.js';
import { useDebouncedState } from '@work-orders/common/hooks/use-debounced-state.js';
import { useAuthenticatedFetch } from '@work-orders/common-pos/hooks/use-authenticated-fetch.js';
import { useWorkOrderInfoQuery } from '@work-orders/common/queries/use-work-order-info-query.js';
import { WorkOrderInfo } from '@web/services/work-orders/types.js';
import { List, ListRow, ScrollView, Stack, Text } from '@shopify/retail-ui-extensions-react';
import { useCustomerQueries } from '@work-orders/common/queries/use-customer-query.js';
import { ControlledSearchBar } from '@work-orders/common-pos/components/ControlledSearchBar.js';
import { extractErrorMessage } from '@work-orders/common-pos/util/errors.js';

// TODO: shared screens in common-pos (or new package)

export function WorkOrderSelector() {
  const [query, setQuery] = useDebouncedState('');

  const { Screen, closePopup } = useScreen('WorkOrderSelector', () => {
    setQuery('', true);
  });

  const fetch = useAuthenticatedFetch();
  const workOrderInfoQuery = useWorkOrderInfoQuery({
    fetch,
    query,
  });
  const workOrderInfos = workOrderInfoQuery.data?.pages ?? [];

  const rows = useWorkOrderRows(workOrderInfos, closePopup);

  return (
    <Screen title={'Select Work Order'} presentation={{ sheet: true }}>
      <ScrollView>
        <Stack direction="horizontal" alignment="center" flex={1} paddingHorizontal={'HalfPoint'}>
          <Text variant="body" color="TextSubdued">
            {workOrderInfoQuery.isRefetching ? 'Reloading...' : ' '}
          </Text>
        </Stack>
        <ControlledSearchBar
          value={query}
          onTextChange={(query: string) => setQuery(query, query === '')}
          onSearch={() => {}}
          placeholder="Search work orders"
        />
        <List
          data={rows}
          onEndReached={() => workOrderInfoQuery.fetchNextPage()}
          isLoadingMore={workOrderInfoQuery.isLoading}
        />
        {workOrderInfoQuery.isLoading && (
          <Stack direction="horizontal" alignment="center" flex={1} paddingVertical="ExtraLarge">
            <Text variant="body" color="TextSubdued">
              Loading work orders...
            </Text>
          </Stack>
        )}
        {workOrderInfoQuery.isSuccess && rows.length === 0 && (
          <Stack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
            <Text variant="body" color="TextSubdued">
              No work orders found
            </Text>
          </Stack>
        )}
        {workOrderInfoQuery.isError && (
          <Stack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
            <Text color="TextCritical" variant="body">
              {extractErrorMessage(workOrderInfoQuery.error, 'An error occurred while loading work orders')}
            </Text>
          </Stack>
        )}
      </ScrollView>
    </Screen>
  );
}

function useWorkOrderRows(workOrderInfos: WorkOrderInfo[], closePopup: ClosePopupFn<'WorkOrderSelector'>) {
  const fetch = useAuthenticatedFetch();

  const customerIds = workOrderInfos.map(workOrderInfo => workOrderInfo.customerId);
  const customerQueries = useCustomerQueries({ fetch, ids: customerIds });

  return workOrderInfos.map<ListRow>(workOrderInfo => {
    const customerQuery = customerQueries[workOrderInfo.customerId];

    return {
      id: workOrderInfo.name,
      onPress: () => {
        const { orderId = null, orderName = null } =
          workOrderInfo.order.type === 'order'
            ? { orderId: workOrderInfo.order.id, orderName: workOrderInfo.order.name }
            : {};

        closePopup({
          workOrderName: workOrderInfo.name,
          orderId,
          orderName,
          customerId: workOrderInfo.customerId,
          customerName: customerQuery?.data?.displayName ?? null,
        });
      },
      leftSide: {
        label: workOrderInfo.name,
        subtitle: [workOrderInfo.status, customerQuery?.data?.displayName],
      },
      rightSide: {
        showChevron: true,
      },
    };
  });
}