import { Button, List, ListRow, ScrollView, Selectable, Stack, Text } from '@shopify/retail-ui-extensions-react';
import { OverdueStatus, useWorkOrderInfoQuery } from '@work-orders/common/queries/use-work-order-info-query.js';
import type { FetchWorkOrderInfoPageResponse } from '@web/controllers/api/work-order.js';
import { useCustomerQueries, useCustomerQuery } from '@work-orders/common/queries/use-customer-query.js';
import { useState } from 'react';
import { useEmployeeQueries } from '@work-orders/common/queries/use-employee-query.js';
import { ID } from '@web/services/gql/queries/generated/schema.js';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { ResponsiveStack } from '@teifi-digital/pos-tools/components/ResponsiveStack.js';
import { ControlledSearchBar } from '@teifi-digital/pos-tools/components/ControlledSearchBar.js';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { useCurrencyFormatter } from '@work-orders/common-pos/hooks/use-currency-formatter.js';
import { useRouter } from '../routes.js';
import { useWorkOrderQueries } from '@work-orders/common/queries/use-work-order-query.js';
import { useScreen } from '@teifi-digital/pos-tools/router';
import { workOrderToCreateWorkOrder } from '../dto/work-order-to-create-work-order.js';
import { useSettingsQuery } from '@work-orders/common/queries/use-settings-query.js';
import { BigDecimal } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { useDebouncedState } from '@work-orders/common-pos/hooks/use-debounced-state.js';
import { CustomFieldFilter } from '@web/services/custom-field-filters.js';
import { getCustomFieldFilterText } from '@work-orders/common-pos/screens/custom-fields/CustomFieldFilterConfig.js';
import { PaymentStatus, PurchaseOrderStatus } from '@web/schemas/generated/work-order-pagination-options.js';
import { titleCase } from '@teifi-digital/shopify-app-toolbox/string';
import { getPurchaseOrderBadges } from '../util/badges.js';
import { unique } from '@teifi-digital/shopify-app-toolbox/array';
import { isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { useCalculateWorkOrderQueries } from '@work-orders/common/queries/use-calculate-work-order-queries.js';
import { useCustomFieldsPresetsQuery } from '@work-orders/common/queries/use-custom-fields-presets-query.js';
import { MINUTE_IN_MS, SECOND_IN_MS } from '@work-orders/common/time/constants.js';

export function Entry() {
  const [status, setStatus] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState<ID | null>(null);
  const [employeeIds, setEmployeeIds] = useState<ID[]>([]);
  const [customFieldFilters, setCustomFieldFilters] = useState<CustomFieldFilter[]>([]);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null);
  const [overdueStatus, setOverdueStatus] = useState<OverdueStatus | null>(null);
  const [purchaseOrderStatus, setPurchaseOrderStatus] = useState<PurchaseOrderStatus | null>(null);

  const [query, setQuery] = useDebouncedState('');
  const fetch = useAuthenticatedFetch();

  const workOrderInfoQuery = useWorkOrderInfoQuery({
    fetch,
    query,
    employeeIds,
    status: status ?? undefined,
    customerId: customerId ?? undefined,
    paymentStatus: paymentStatus ?? undefined,
    overdueStatus: overdueStatus ?? undefined,
    purchaseOrderStatus: purchaseOrderStatus ?? undefined,
    customFieldFilters,
  });
  const employeeQueries = useEmployeeQueries({ fetch, ids: employeeIds });
  const customerQuery = useCustomerQuery({ fetch, id: customerId });
  const settingsQuery = useSettingsQuery({ fetch });
  const customFieldsPresetsQuery = useCustomFieldsPresetsQuery({ fetch, type: 'WORK_ORDER' });

  const rows = useWorkOrderRows(workOrderInfoQuery.data?.pages ?? []);

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
      <ResponsiveStack
        direction={'horizontal'}
        alignment={'space-between'}
        sm={{ direction: 'vertical', alignment: 'flex-start' }}
      >
        <ResponsiveStack direction={'horizontal'} flexWrap={'wrap'} sm={{ direction: 'vertical', flexWrap: undefined }}>
          <Button
            title={'Filter status'}
            type={'plain'}
            onPress={() =>
              router.push('StatusSelector', {
                onSelect: status => setStatus(status),
              })
            }
          />
          <Button
            title={'Filter payment status'}
            type={'plain'}
            onPress={() =>
              router.push('PaymentStatusSelector', {
                onSelect: status => setPaymentStatus(status),
              })
            }
          />
          <Button
            title={'Filter overdue status'}
            type={'plain'}
            onPress={() =>
              router.push('OverdueStatusSelector', {
                onSelect: status => setOverdueStatus(status),
              })
            }
          />
          <Button
            title={'Filter purchase order status'}
            type={'plain'}
            onPress={() =>
              router.push('PurchaseOrderStatusSelector', {
                onSelect: status => setPurchaseOrderStatus(status),
              })
            }
          />
          <Button
            title={'Filter customer'}
            type={'plain'}
            onPress={() =>
              router.push('CustomerSelector', {
                onSelect: customer => setCustomerId(customer),
              })
            }
          />
          <Button
            title={'Filter employees'}
            type={'plain'}
            onPress={() =>
              router.push('EmployeeSelector', {
                selected: employeeIds,
                onSelect: id => setEmployeeIds(c => [...c, id]),
                onDeselect: id => setEmployeeIds(c => c.filter(e => e !== id)),
              })
            }
          />
          <Button
            title={'Filter custom fields'}
            type={'plain'}
            onPress={() =>
              router.push('CustomFieldFilterConfig', {
                onSave: setCustomFieldFilters,
                initialFilters: customFieldFilters,
              })
            }
          />
        </ResponsiveStack>
        <ResponsiveStack direction={'horizontal'} flexWrap={'wrap'} sm={{ direction: 'vertical', flexWrap: undefined }}>
          {status && (
            <Selectable onPress={() => setStatus(null)}>
              <Stack direction="horizontal" spacing={2} alignment={'center'} paddingVertical={'ExtraLarge'}>
                <Text color={'TextCritical'}>Clear status</Text>
              </Stack>
            </Selectable>
          )}
          {paymentStatus && (
            <Selectable onPress={() => setPaymentStatus(null)}>
              <Stack direction="horizontal" spacing={2} alignment={'center'} paddingVertical={'ExtraLarge'}>
                <Text color={'TextCritical'}>Clear payment status</Text>
              </Stack>
            </Selectable>
          )}
          {overdueStatus && (
            <Selectable onPress={() => setOverdueStatus(null)}>
              <Stack direction="horizontal" spacing={2} alignment={'center'} paddingVertical={'ExtraLarge'}>
                <Text color={'TextCritical'}>Clear overdue status</Text>
              </Stack>
            </Selectable>
          )}
          {purchaseOrderStatus && (
            <Selectable onPress={() => setPurchaseOrderStatus(null)}>
              <Stack direction="horizontal" spacing={2} alignment={'center'} paddingVertical={'ExtraLarge'}>
                <Text color={'TextCritical'}>Clear purchase order status</Text>
              </Stack>
            </Selectable>
          )}
          {customerId && (
            <Selectable onPress={() => setCustomerId(null)}>
              <Stack direction="horizontal" spacing={2} alignment={'center'} paddingVertical={'ExtraLarge'}>
                <Text color={'TextCritical'}>Clear customer</Text>
              </Stack>
            </Selectable>
          )}
          {employeeIds.length > 0 && (
            <Selectable onPress={() => setEmployeeIds([])}>
              <Stack direction="horizontal" spacing={2} alignment={'center'} paddingVertical={'ExtraLarge'}>
                <Text color={'TextCritical'}>Clear employees</Text>
              </Stack>
            </Selectable>
          )}
          {customFieldFilters.length > 0 && (
            <Selectable onPress={() => setCustomFieldFilters([])}>
              <Stack direction="horizontal" spacing={2} alignment={'center'} paddingVertical={'ExtraLarge'}>
                <Text color={'TextCritical'}>Clear custom fields</Text>
              </Stack>
            </Selectable>
          )}
        </ResponsiveStack>
      </ResponsiveStack>
      <Stack direction={'horizontal'} spacing={5} flexWrap={'wrap'}>
        {status && (
          <>
            <Text variant={'sectionHeader'}>Status:</Text>
            <Text variant={'captionRegular'} color={'TextSubdued'}>
              {status}
            </Text>
          </>
        )}
      </Stack>
      <Stack direction={'horizontal'} spacing={5} flexWrap={'wrap'}>
        {paymentStatus && (
          <>
            <Text variant={'sectionHeader'}>Payment Status:</Text>
            <Text variant={'captionRegular'} color={'TextSubdued'}>
              {titleCase(paymentStatus)}
            </Text>
          </>
        )}
      </Stack>
      <Stack direction={'horizontal'} spacing={5} flexWrap={'wrap'}>
        {overdueStatus && (
          <>
            <Text variant={'sectionHeader'}>Overdue Status:</Text>
            <Text variant={'captionRegular'} color={'TextSubdued'}>
              {titleCase(overdueStatus)}
            </Text>
          </>
        )}
      </Stack>
      <Stack direction={'horizontal'} spacing={5} flexWrap={'wrap'}>
        {purchaseOrderStatus && (
          <>
            <Text variant={'sectionHeader'}>Purchase Order Status:</Text>
            <Text variant={'captionRegular'} color={'TextSubdued'}>
              {titleCase(purchaseOrderStatus)}
            </Text>
          </>
        )}
      </Stack>
      <Stack direction={'horizontal'} spacing={5} flexWrap={'wrap'}>
        {customerId && (
          <>
            <Text variant={'sectionHeader'}>Customer:</Text>
            <Text variant={'captionRegular'} color={'TextSubdued'}>
              {customerQuery.data?.displayName ?? 'Unknown customer'}
            </Text>
          </>
        )}
      </Stack>
      <Stack direction={'horizontal'} spacing={5} flexWrap={'wrap'}>
        {employeeIds.length > 0 && <Text variant={'sectionHeader'}>Employees:</Text>}
        {employeeIds.map(id => (
          <Text key={id} variant={'captionRegular'} color={'TextSubdued'}>
            {employeeQueries[id]?.data?.name ?? 'Unknown employee'}
          </Text>
        ))}
      </Stack>

      <ResponsiveStack direction={'vertical'} spacing={1} paddingVertical={'ExtraSmall'}>
        {customFieldFilters.length > 0 && (
          <>
            <Text variant="body" color="TextSubdued">
              Custom Fields:
            </Text>
            {customFieldFilters.map((filter, i) => (
              <Text key={i} variant="body" color="TextSubdued">
                • {getCustomFieldFilterText(filter)}
              </Text>
            ))}
          </>
        )}
      </ResponsiveStack>
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

    let parsedDueDate = new Date(workOrder.dueDate);
    // convert from UTC to local time
    parsedDueDate = new Date(parsedDueDate.getTime() + parsedDueDate.getTimezoneOffset() * MINUTE_IN_MS);

    const dueDateString = parsedDueDate.toLocaleDateString();
    const orderNamesSubtitle = workOrder.orders.map(order => order.name).join(' • ');

    let moneySubtitle = extractErrorMessage(calculateWorkOrderQuery.error, 'Loading...');
    let financialStatus = undefined;

    if (calculation) {
      const { outstanding, paid, total } = calculation;

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
      new Date() > parsedDueDate &&
      calculation &&
      BigDecimal.fromMoney(calculation.outstanding).compare(BigDecimal.ZERO) > 0;

    const purchaseOrders = workOrder.items.flatMap(item => item.purchaseOrders);

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
