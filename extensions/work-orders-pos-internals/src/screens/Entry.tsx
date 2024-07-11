import { Button, List, ListRow, ScrollView, Stack, Text } from '@shopify/retail-ui-extensions-react';
import { useWorkOrderInfoQuery } from '@work-orders/common/queries/use-work-order-info-query.js';
import type { FetchWorkOrderInfoPageResponse } from '@web/controllers/api/work-order.js';
import { useCustomerQueries } from '@work-orders/common/queries/use-customer-query.js';
import { useState } from 'react';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { ResponsiveStack } from '@teifi-digital/pos-tools/components/ResponsiveStack.js';
import { ControlledSearchBar } from '@teifi-digital/pos-tools/components/ControlledSearchBar.js';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { useCurrencyFormatter } from '@work-orders/common-pos/hooks/use-currency-formatter.js';
import { useRouter } from '../routes.js';
import { useWorkOrderQueries } from '@work-orders/common/queries/use-work-order-query.js';
import { useScreen } from '@teifi-digital/pos-tools/router';
import { useSettingsQuery } from '@work-orders/common/queries/use-settings-query.js';
import { BigDecimal } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { useDebouncedState } from '@work-orders/common-pos/hooks/use-debounced-state.js';
import { getPurchaseOrderBadges } from '../util/badges.js';
import { unique } from '@teifi-digital/shopify-app-toolbox/array';
import { hasPropertyValue, isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { useCalculateWorkOrderQueries } from '@work-orders/common/queries/use-calculate-work-order-queries.js';
import { useCustomFieldsPresetsQuery } from '@work-orders/common/queries/use-custom-fields-presets-query.js';
import { DAY_IN_MS, MINUTE_IN_MS, SECOND_IN_MS } from '@work-orders/common/time/constants.js';
import { workOrderToCreateWorkOrder } from '@work-orders/common/create-work-order/work-order-to-create-work-order.js';
import { WorkOrderFiltersDisplay, WorkOrderFiltersObj } from './popups/WorkOrderFilters.js';

export function Entry() {
  const [filters, setFilters] = useState<WorkOrderFiltersObj>({ customFieldFilters: [], employeeIds: [] });

  const [query, setQuery] = useDebouncedState('');
  const fetch = useAuthenticatedFetch();

  const workOrderInfoQuery = useWorkOrderInfoQuery({
    fetch,
    query,
    ...filters,
  });
  const settingsQuery = useSettingsQuery({ fetch });
  const customFieldsPresetsQuery = useCustomFieldsPresetsQuery({ fetch, type: 'WORK_ORDER' });

  const rows = useWorkOrderRows(workOrderInfoQuery.data?.pages?.flat(1) ?? []);

  const screen = useScreen();
  screen.setIsLoading(settingsQuery.isLoading || customFieldsPresetsQuery.isLoading);

  const router = useRouter();

  return (
    <ScrollView>
      <ResponsiveStack
        direction={'horizontal'}
        alignment={'space-between'}
        paddingVertical={'Small'}
        sm={{ direction: 'vertical', alignment: 'center' }}
      >
        <ResponsiveStack direction={'horizontal'} sm={{ alignment: 'center', paddingVertical: 'Small' }}>
          <Text variant="headingLarge">Work Orders</Text>
        </ResponsiveStack>
        <ResponsiveStack direction={'horizontal'} sm={{ direction: 'vertical' }}>
          <Button title="Import Work Order" type={'plain'} onPress={() => router.push('ImportOrderSelector', {})} />
          <Button title={'New Work Order'} type={'primary'} onPress={() => router.push('NewWorkOrder', {})} />
        </ResponsiveStack>
      </ResponsiveStack>

      <Stack direction="horizontal" alignment="center" flex={1} paddingHorizontal={'HalfPoint'}>
        <Text variant="body" color="TextSubdued">
          {workOrderInfoQuery.isRefetching ? 'Reloading...' : ' '}
        </Text>
      </Stack>
      <Button title={'Filters'} onPress={() => router.push('WorkOrderFilters', { filters, onChange: setFilters })} />
      <WorkOrderFiltersDisplay filters={filters} />

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

function useWorkOrderRows(workOrderInfos: FetchWorkOrderInfoPageResponse[number][]): ListRow[] {
  const currencyFormatter = useCurrencyFormatter();
  const fetch = useAuthenticatedFetch();

  const workOrderQueries = useWorkOrderQueries(
    { fetch, names: workOrderInfos.map(({ name }) => name) },
    { staleTime: 30 * SECOND_IN_MS },
  );

  const workOrders = Object.values(workOrderQueries)
    .map(query => query.data?.workOrder)
    .filter(isNonNullable);

  const calculateWorkOrderQueries = useCalculateWorkOrderQueries({
    fetch,
    workOrders: workOrders.map(wo => {
      const { items, charges, customerId, discount } = workOrderToCreateWorkOrder(wo);
      return { name: wo.name, items, charges, customerId, discount };
    }),
  });

  const customerIds = unique(workOrderInfos.map(info => info.customerId));
  const customerQueries = useCustomerQueries({ fetch, ids: customerIds });

  const router = useRouter();
  const screen = useScreen();
  screen.setIsLoading(Object.values(workOrderQueries).some(query => query.isFetching));

  return workOrders.flatMap<ListRow>(workOrder => {
    const workOrderQuery = workOrderQueries[workOrder.name];
    const customerQuery = customerQueries[workOrder.customerId];
    const calculateWorkOrderQuery = calculateWorkOrderQueries[workOrder.name];

    if (!workOrderQuery || !customerQuery || !calculateWorkOrderQuery) return [];

    const customer = customerQuery.data;
    const calculation = calculateWorkOrderQuery.data;

    const dueDateUtc = new Date(workOrder.dueDate);
    const dueDateLocal = new Date(dueDateUtc.getTime() + dueDateUtc.getTimezoneOffset() * MINUTE_IN_MS);

    const dueDateString = dueDateLocal.toLocaleDateString();
    const orderNamesSubtitle = workOrder.orders.map(order => order.name).join(' • ');

    let moneySubtitle = extractErrorMessage(calculateWorkOrderQuery.error, 'Loading...');
    let financialStatus = undefined;

    if (calculation) {
      const { outstanding, total } = calculation;

      const paid = BigDecimal.fromMoney(total).subtract(BigDecimal.fromMoney(outstanding)).toMoney();

      moneySubtitle = `${currencyFormatter(paid)} paid of ${currencyFormatter(total)}`;

      const outstandingBigDecimal = BigDecimal.fromMoney(outstanding);
      const totalBigDecimal = BigDecimal.fromMoney(total);

      if (outstandingBigDecimal.compare(BigDecimal.ZERO) <= 0) {
        financialStatus = 'Fully Paid';
      } else if (outstandingBigDecimal.compare(totalBigDecimal) < 0) {
        financialStatus = 'Partially paid';
      } else {
        financialStatus = 'Unpaid';
      }
    }

    const isOverdue =
      Date.now() > dueDateUtc.getTime() + DAY_IN_MS &&
      calculation &&
      BigDecimal.fromMoney(calculation.outstanding).compare(BigDecimal.ZERO) > 0;

    const purchaseOrders = workOrder.items
      .filter(hasPropertyValue('type', 'product'))
      .flatMap(item => item.purchaseOrders);

    return {
      id: workOrder.name,
      onPress: async () => {
        const result = await workOrderQuery.refetch();
        const workOrder = result.data?.workOrder;

        if (!workOrder) return;

        router.push('WorkOrder', { initial: workOrderToCreateWorkOrder(workOrder) });
      },
      leftSide: {
        label: workOrder.name,
        subtitle: orderNamesSubtitle ? [moneySubtitle, orderNamesSubtitle] : [moneySubtitle],
        badges: (
          [
            customer ? ({ variant: 'neutral', text: customer.displayName } as const) : undefined,
            { variant: 'highlight', text: workOrder.status },
            { variant: 'warning', text: `Due ${dueDateString}` },
            isOverdue ? ({ variant: 'critical', text: 'Overdue' } as const) : undefined,
            financialStatus ? ({ variant: 'highlight', text: financialStatus } as const) : undefined,
            ...getPurchaseOrderBadges(purchaseOrders, false),
          ] as const
        ).filter(isNonNullable),
      },
      rightSide: {
        showChevron: true,
      },
    };
  });
}
