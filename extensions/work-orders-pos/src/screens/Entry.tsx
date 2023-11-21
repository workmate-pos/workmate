import { NavigateFn, useScreen } from '../hooks/use-screen';
import { Button, List, ListRow, ScrollView, SearchBar, Stack, Text } from '@shopify/retail-ui-extensions-react';
import { useEffect, useState } from 'react';
import { useWorkOrderInfoPageQuery, WorkOrderInfo } from '../queries/use-work-order-info-page-query';
import { CurrencyFormatter, useCurrencyFormatter } from '../hooks/use-currency-formatter';
import { useSettingsQuery } from '../queries/use-settings-query';
import { useStorePropertiesQuery } from '../queries/use-store-properties-query';
import { useDebouncedState } from '../hooks/use-debounced-state';

export function Entry() {
  // prefetch these queries so they're ready when we need them
  useSettingsQuery();
  useStorePropertiesQuery();

  const [reloading, setReloading] = useDebouncedState(false);
  const { Screen, navigate } = useScreen('Entry', ({ forceReload = false } = {}) => {
    if (forceReload) {
      setReloading(true, true);
    }
  });

  useEffect(() => {
    if (reloading) {
      setWorkOrderInfos([]);
      setLoadMore(true);
      setError(null);
      setReloading(false, true);
    } else {
      workOrderInfoPageQuery.remove();
    }
  }, [reloading]);

  const [query, setQuery] = useState('');
  const [workOrderInfos, setWorkOrderInfos] = useState<WorkOrderInfo[]>([]);
  const [loadMore, setLoadMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const workOrderInfoPageQuery = useWorkOrderInfoPageQuery({
    offset: workOrderInfos.length,
    enabled: loadMore,
    query,
  });

  useEffect(() => {
    if (reloading) return;

    const { data } = workOrderInfoPageQuery;
    if (data === undefined) return;

    if (data === null) {
      setError('Error loading work orders');
    } else {
      setWorkOrderInfos(workOrders => [...workOrders, ...data.infoPage]);
    }

    setLoadMore(false);
  }, [workOrderInfoPageQuery.data]);

  const currencyFormatter = useCurrencyFormatter();
  const rows = getWorkOrderRows(workOrderInfos, navigate, currencyFormatter);

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
          <SearchBar
            onTextChange={query => {
              setQuery(query);
              setReloading(true, !query);
            }}
            onSearch={() => {}}
            placeholder="Search work orders"
          />
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
