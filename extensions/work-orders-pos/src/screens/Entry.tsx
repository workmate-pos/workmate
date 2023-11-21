import { NavigateFn, useScreen } from '../hooks/use-screen';
import { Button, List, ListRow, ScrollView, SearchBar, Stack, Text } from '@shopify/retail-ui-extensions-react';
import { useWorkOrderInfoQuery, WorkOrderInfo } from '../queries/use-work-order-info-query';
import { CurrencyFormatter, useCurrencyFormatter } from '../hooks/use-currency-formatter';
import { useSettingsQuery } from '../queries/use-settings-query';
import { useStorePropertiesQuery } from '../queries/use-store-properties-query';
import { useQueryClient } from 'react-query';
import { useDebouncedState } from '../hooks/use-debounced-state';

export function Entry() {
  // prefetch these queries so they're ready when we need them
  useSettingsQuery();
  useStorePropertiesQuery();

  const queryClient = useQueryClient();
  const { Screen, navigate } = useScreen('Entry', ({ forceReload = false } = {}) => {
    if (forceReload) {
      queryClient.invalidateQueries(['work-order-info']);
    }
  });

  const [query, setQuery] = useDebouncedState('');
  const workOrderInfoQuery = useWorkOrderInfoQuery({ query });
  const workOrderInfo = workOrderInfoQuery.data?.pages ?? [];

  const currencyFormatter = useCurrencyFormatter();
  const rows = getWorkOrderRows(workOrderInfo, navigate, currencyFormatter);

  return (
    <Screen title="Work Orders">
      <ScrollView>
        <Stack direction="vertical" spacing={2}>
          <Stack direction="horizontal" alignment="space-between">
            <Text variant="headingLarge">Work Orders</Text>
            <Button
              title="New Work Order"
              type="primary"
              onPress={() => navigate('WorkOrder', { type: 'new-work-order' })}
            />
          </Stack>
          <SearchBar onTextChange={setQuery} onSearch={() => {}} placeholder="Search work orders" />
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

function getWorkOrderRows(
  workOrders: WorkOrderInfo[],
  navigate: NavigateFn,
  currencyFormatter: CurrencyFormatter,
): ListRow[] {
  return workOrders.map<ListRow>(({ name, productAmount, discountAmount, taxAmount, status, dueDate }) => {
    const total = productAmount + taxAmount - discountAmount;
    const dueDateString = new Date(dueDate).toLocaleDateString();

    return {
      id: name,
      onPress: () => {
        navigate('WorkOrder', { type: 'load-work-order', name });
      },
      leftSide: {
        label: name,
        subtitle: [currencyFormatter(total / 100)],
        badges: [
          {
            variant: 'highlight',
            text: status,
          },
          {
            variant: 'warning',
            text: `Due ${dueDateString}`,
          },
        ],
      },
      rightSide: {
        showChevron: true,
      },
    };
  });
}
