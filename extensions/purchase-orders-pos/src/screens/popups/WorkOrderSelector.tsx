import { useDebouncedState } from '@work-orders/common/hooks/use-debounced-state.js';
import { useWorkOrderInfoQuery } from '@work-orders/common/queries/use-work-order-info-query.js';
import { WorkOrderInfo } from '@web/services/work-orders/types.js';
import { List, ListRow, ScrollView, Stack, Text } from '@shopify/retail-ui-extensions-react';
import { useCustomerQueries } from '@work-orders/common/queries/use-customer-query.js';
import type { CreatePurchaseOrder } from '@web/schemas/generated/create-purchase-order.js';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { ControlledSearchBar } from '@teifi-digital/pos-tools/components/ControlledSearchBar.js';
import { extractErrorMessage } from '@teifi-digital/pos-tools/utils/errors.js';
import { useRouter } from '../../routes.js';

// TODO: shared screens in common-pos (or new package)

export function WorkOrderSelector({
  onSelect,
}: {
  onSelect: (
    workOrder: Pick<CreatePurchaseOrder, 'workOrderName' | 'customerId' | 'customerName' | 'orderName' | 'orderId'>,
  ) => void;
}) {
  const [query, setQuery] = useDebouncedState('');

  const fetch = useAuthenticatedFetch();
  const workOrderInfoQuery = useWorkOrderInfoQuery({
    fetch,
    query,
  });
  const workOrderInfos = workOrderInfoQuery.data?.pages ?? [];

  const rows = useWorkOrderRows(workOrderInfos, query, onSelect);

  return (
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
  );
}

function useWorkOrderRows(
  workOrderInfos: WorkOrderInfo[],
  query: string,
  onSelect: (
    workOrder: Pick<CreatePurchaseOrder, 'workOrderName' | 'customerId' | 'customerName' | 'orderName' | 'orderId'>,
  ) => void,
) {
  const fetch = useAuthenticatedFetch();

  const customerIds = workOrderInfos.map(workOrderInfo => workOrderInfo.customerId);
  const customerQueries = useCustomerQueries({ fetch, ids: customerIds });

  const router = useRouter();

  const queryFilter = (workOrderInfo: WorkOrderInfo) => {
    return !query || workOrderInfo.name.toLowerCase().includes(query.toLowerCase());
  };

  return workOrderInfos.filter(queryFilter).map<ListRow>(workOrderInfo => {
    const customerQuery = customerQueries[workOrderInfo.customerId];

    return {
      id: workOrderInfo.name,
      onPress: () => {
        const { orderId = null, orderName = null } =
          workOrderInfo.order.type === 'order'
            ? { orderId: workOrderInfo.order.id, orderName: workOrderInfo.order.name }
            : {};

        onSelect({
          workOrderName: workOrderInfo.name,
          orderId,
          orderName,
          customerId: workOrderInfo.customerId,
          customerName: customerQuery?.data?.displayName ?? null,
        });

        router.popCurrent();
      },
      leftSide: {
        label: workOrderInfo.name,
        subtitle: customerQuery?.data?.displayName
          ? [workOrderInfo.status, customerQuery.data?.displayName]
          : [workOrderInfo.status],
      },
      rightSide: {
        showChevron: true,
      },
    };
  });
}
