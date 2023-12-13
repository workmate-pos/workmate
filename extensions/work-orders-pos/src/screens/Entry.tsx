import {
  BadgeVariant,
  Button,
  List,
  ListRow,
  ScrollView,
  SearchBar,
  Stack,
  Text,
} from '@shopify/retail-ui-extensions-react';
import { NavigateFn, useScreen } from '../hooks/use-screen.js';
import { useWorkOrderInfoQuery, WorkOrderInfo } from '../queries/use-work-order-info-query.js';
import { CurrencyFormatter, useCurrencyFormatter } from '../hooks/use-currency-formatter.js';
import { useDebouncedState } from '@common/hooks/use-debounced-state.js';

export function Entry() {
  const { Screen, navigate } = useScreen('Entry');

  const [query, setQuery] = useDebouncedState('');
  const workOrderInfoQuery = useWorkOrderInfoQuery({ query });
  const workOrderInfo = workOrderInfoQuery.data?.pages ?? [];

  const currencyFormatter = useCurrencyFormatter();
  const rows = getWorkOrderRows(workOrderInfo, navigate, currencyFormatter);

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
            onTextChange={query => {
              setQuery(query, query === '');
            }}
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

function getWorkOrderRows(
  workOrders: WorkOrderInfo[],
  navigate: NavigateFn,
  currencyFormatter: CurrencyFormatter,
): ListRow[] {
  return workOrders.map<ListRow>(
    ({
      name,
      productAmount,
      discountAmount,
      taxAmount,
      status,
      dueDate,
      paidAmount,
      shippingAmount,
      hasDeposit,
      serviceAmount,
    }) => {
      const total = serviceAmount + productAmount + taxAmount + shippingAmount - discountAmount;
      const dueDateString = new Date(dueDate).toLocaleDateString();

      const paymentStatus = paidAmount >= total ? 'Paid' : hasDeposit ? 'Deposit' : 'Unpaid';
      const paymentBadgeVariant: BadgeVariant = paidAmount >= total ? 'success' : hasDeposit ? 'highlight' : 'critical';

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
            {
              variant: paymentBadgeVariant,
              text: paymentStatus,
            },
          ],
        },
        rightSide: {
          showChevron: true,
        },
      };
    },
  );
}
