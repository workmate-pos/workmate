import { NavigateFn, useScreen } from '../hooks/use-screen';
import { Button, List, ListRow, ScrollView, SearchBar, Stack, Text } from '@shopify/retail-ui-extensions-react';
import { useEffect, useState } from 'react';
import { useWorkOrderInfoPageQuery, WorkOrderInfo } from '../queries/use-work-order-info-page-query';

export function NewEntry() {
  const [resetting, setResetting] = useState(false);
  const { Screen, navigate } = useScreen('Entry', ({ forceReload = false } = {}) => {
    if (forceReload) {
      setResetting(true);
      setWorkOrderInfos([]);
      setLoadMore(true);
      setError(null);
    }
  });

  useEffect(() => {
    if (resetting) {
      setResetting(false);
    } else {
      workOrderInfoPageQuery.remove();
    }
  }, [resetting]);

  const [query, setQuery] = useState<string | null>(null);
  const [workOrderInfos, setWorkOrderInfos] = useState<WorkOrderInfo[]>([]);
  const [loadMore, setLoadMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const workOrderInfoPageQuery = useWorkOrderInfoPageQuery({
    offset: workOrderInfos.length,
    enabled: loadMore && !resetting,
  });

  useEffect(() => {
    if (resetting) return;

    const { data } = workOrderInfoPageQuery;
    if (data === undefined) return;

    if (data === null) {
      setError('Error loading work orders');
    } else {
      setWorkOrderInfos(workOrders => [...workOrders, ...data.infoPage]);
    }

    setLoadMore(false);
  }, [workOrderInfoPageQuery.data]);

  const rows = getWorkOrderRows(workOrderInfos, navigate);

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
          <List data={rows} onEndReached={() => setLoadMore(true)} isLoadingMore={workOrderInfoPageQuery.isLoading} />
          {workOrderInfoPageQuery.isLoading && (
            <Stack direction="horizontal" alignment="center" flex={1} paddingVertical="ExtraLarge">
              <Text variant="body" color="TextSubdued">
                Loading work orders...
              </Text>
            </Stack>
          )}
          {!workOrderInfoPageQuery.isLoading && !error && rows.length === 0 && (
            <Stack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
              <Text variant="body" color="TextSubdued">
                No work orders found
              </Text>
            </Stack>
          )}
          {error && (
            <Stack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
              <Text color="TextCritical" variant="body">
                {error}
              </Text>
            </Stack>
          )}
        </Stack>
      </ScrollView>
    </Screen>
  );
}

function getWorkOrderRows(workOrders: WorkOrderInfo[], navigate: NavigateFn): ListRow[] {
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
        subtitle: [`CA$ ${(total / 100).toFixed(2)}`],
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
