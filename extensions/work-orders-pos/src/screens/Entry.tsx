import { Button, List, ListRow, ScrollView, SearchBar, Stack, Text } from '@shopify/retail-ui-extensions-react';
import { NavigateFn, useScreen } from '../hooks/use-screen.js';
import { useCurrencyFormatter } from '../hooks/use-currency-formatter.js';
import { useDebouncedState } from '@work-orders/common/hooks/use-debounced-state.js';
import { useWorkOrderInfoQuery } from '@work-orders/common/queries/use-work-order-info-query.js';
import { useAuthenticatedFetch } from '../hooks/use-authenticated-fetch.js';
import type { FetchWorkOrderInfoPageResponse } from '@web/controllers/api/work-order.js';
import { useCustomerQueries } from '@work-orders/common/queries/use-customer-query.js';
import { titleCase } from '@work-orders/common/util/casing.js';

export function Entry() {
  const { Screen, navigate } = useScreen('Entry');

  const [query, setQuery] = useDebouncedState('');
  const fetch = useAuthenticatedFetch();
  const workOrderInfoQuery = useWorkOrderInfoQuery({ fetch, query });
  const workOrderInfo = workOrderInfoQuery.data?.pages ?? [];

  const rows = useWorkOrderRows(workOrderInfo, navigate);

  return (
    <Screen title="Work Orders">
      <ScrollView>
        <Stack direction="vertical">
          <Stack direction="horizontal" alignment="space-between">
            <Text variant="headingLarge">Work Orders</Text>
            <Stack direction={'horizontal'} spacing={2}>
              <Button title="Import Work Order" type={'plain'} onPress={() => navigate('ImportOrderSelector')} />
              <Button
                title="New Work Order"
                type="primary"
                onPress={() => navigate('WorkOrder', { type: 'new-work-order' })}
              />
            </Stack>
          </Stack>
          <Stack direction="horizontal" alignment="center" flex={1} paddingHorizontal={'HalfPoint'}>
            <Text variant="body" color="TextSubdued">
              {workOrderInfoQuery.isRefetching ? 'Reloading...' : ' '}
            </Text>
          </Stack>
          <SearchBar
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
                An error occurred while loading work orders
              </Text>
            </Stack>
          )}
        </Stack>
      </ScrollView>
    </Screen>
  );
}

function useWorkOrderRows(workOrderInfos: FetchWorkOrderInfoPageResponse[number][], navigate: NavigateFn): ListRow[] {
  const currencyFormatter = useCurrencyFormatter();
  const fetch = useAuthenticatedFetch();
  const customerQueries = useCustomerQueries({ fetch, ids: workOrderInfos.map(({ customerId }) => customerId) });

  return workOrderInfos.map<ListRow>(({ name, status, dueDate, order, customerId }) => {
    const dueDateString = new Date(dueDate).toLocaleDateString();
    const customer = customerQueries[customerId]?.data;

    return {
      id: name,
      onPress: () => {
        navigate('WorkOrder', { type: 'load-work-order', name });
      },
      leftSide: {
        label: name,
        subtitle: [[currencyFormatter(order.outstanding), currencyFormatter(order.total)].join(' • ')],
        badges: [
          {
            variant: 'neutral',
            text: customer?.displayName ?? 'Unknown Customer',
          },
          {
            variant: 'highlight',
            text: status,
          },
          {
            variant: 'warning',
            text: `Due ${dueDateString}`,
          },
          ...(order.financialStatus
            ? [
                {
                  variant: 'highlight',
                  text: titleCase(order.financialStatus.replace('_', ' ')),
                } as const,
              ]
            : []),
        ],
      },
      rightSide: {
        showChevron: true,
      },
    };
  });
}
