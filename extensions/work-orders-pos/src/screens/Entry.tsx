import {
  Button,
  List,
  ListRow,
  Stack,
  Text,
  useCartSubscription,
  useExtensionApi,
} from '@shopify/retail-ui-extensions-react';
import { OverdueStatus, useWorkOrderInfoQuery } from '@work-orders/common/queries/use-work-order-info-query.js';
import type { FetchWorkOrderInfoPageResponse } from '@web/controllers/api/work-order.js';
import { useCustomerQuery } from '@work-orders/common/queries/use-customer-query.js';
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
import { createGid } from '@teifi-digital/shopify-app-toolbox/shopify';
import { useSettingsQuery } from '@work-orders/common/queries/use-settings-query.js';
import { BigDecimal } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { defaultCreateWorkOrder } from '../create-work-order/default.js';
import { useDebouncedState } from '@work-orders/common-pos/hooks/use-debounced-state.js';
import { CustomFieldFilter } from '@web/services/custom-field-filters.js';
import { getCustomFieldFilterText } from '@work-orders/common-pos/screens/custom-fields/CustomFieldFilterConfig.js';
import { PaymentStatus } from '@web/schemas/generated/work-order-pagination-options.js';
import { titleCase } from '@teifi-digital/shopify-app-toolbox/string';

export function Entry() {
  const [status, setStatus] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState<ID | null>(null);
  const [employeeIds, setEmployeeIds] = useState<ID[]>([]);
  const [customFieldFilters, setCustomFieldFilters] = useState<CustomFieldFilter[]>([]);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null);
  const [overdueStatus, setOverdueStatus] = useState<OverdueStatus | null>(null);

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
    customFieldFilters,
  });
  const employeeQueries = useEmployeeQueries({ fetch, ids: employeeIds });
  const customerQuery = useCustomerQuery({ fetch, id: customerId });
  const settingsQuery = useSettingsQuery({ fetch });

  const rows = useWorkOrderRows(workOrderInfoQuery.data?.pages ?? []);

  const router = useRouter();
  const cart = useCartSubscription();
  const { toast } = useExtensionApi<'pos.home.modal.render'>();

  return (
    <Stack direction={'vertical'}>
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
          <Button
            title={'New Work Order'}
            type={'primary'}
            onPress={() => {
              if (!settingsQuery.data) {
                toast.show('Settings not loaded');
                return;
              }

              let customerId = null;

              if (cart.customer) {
                customerId = createGid('Customer', String(cart.customer.id));
                toast.show('Imported customer from cart');
              }

              router.push('WorkOrder', {
                initial: {
                  ...defaultCreateWorkOrder({ status: settingsQuery.data.settings.defaultStatus }),
                  customerId,
                },
              });
            }}
          />
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
        <ResponsiveStack direction={'horizontal'} sm={{ direction: 'vertical' }}>
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
        <ResponsiveStack direction={'horizontal'} sm={{ direction: 'vertical' }}>
          {status && <Button title={'Clear status'} type={'plain'} onPress={() => setStatus(null)} />}
          {paymentStatus && (
            <Button title={'Clear payment status'} type={'plain'} onPress={() => setPaymentStatus(null)} />
          )}
          {overdueStatus && (
            <Button title={'Clear overdue status'} type={'plain'} onPress={() => setOverdueStatus(null)} />
          )}
          {customerId && <Button title={'Clear customer'} type={'plain'} onPress={() => setCustomerId(null)} />}
          {employeeIds.length > 0 && (
            <Button title={'Clear employees'} type={'plain'} onPress={() => setEmployeeIds([])} />
          )}
          {customFieldFilters.length > 0 && (
            <Button title={'Clear custom fields'} type={'plain'} onPress={() => setCustomFieldFilters([])} />
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
    </Stack>
  );
}

// TODO: Fix this not updating after saving a work order
function useWorkOrderRows(workOrderInfos: FetchWorkOrderInfoPageResponse[number][]): ListRow[] {
  const currencyFormatter = useCurrencyFormatter();
  const fetch = useAuthenticatedFetch();
  const workOrderQueries = useWorkOrderQueries(
    { fetch, names: workOrderInfos.map(({ name }) => name) },
    { enabled: false },
  );

  const router = useRouter();
  const screen = useScreen();
  screen.setIsLoading(Object.values(workOrderQueries).some(query => query.isFetching));

  return workOrderInfos.flatMap<ListRow>(({ name, status, dueDate, orders, customer }) => {
    const query = workOrderQueries[name];
    if (!query) return [];

    const dueDateString = new Date(dueDate).toLocaleDateString();
    const orderNamesSubtitle = orders.map(order => order.name).join(' • ');

    const outstanding = BigDecimal.sum(...orders.map(order => BigDecimal.fromMoney(order.outstanding)));
    const total = BigDecimal.sum(...orders.map(order => BigDecimal.fromMoney(order.total)));
    const moneySubtitle = [outstanding.toMoney(), total.toMoney()].map(currencyFormatter).join(' • ');

    // TODO: Add deposit captured
    let financialStatus;

    if (outstanding.compare(BigDecimal.ZERO) <= 0) {
      financialStatus = 'Fully Paid';
    } else if (outstanding.compare(total) < 0) {
      financialStatus = 'Partially paid';
    } else {
      financialStatus = 'Unpaid';
    }

    let parsedDueDate = new Date(dueDate);
    // convert from UTC to local time
    parsedDueDate = new Date(parsedDueDate.getTime() + parsedDueDate.getTimezoneOffset() * 60000);

    const isOverdue = new Date() > parsedDueDate;

    return {
      id: name,
      onPress: async () => {
        const result = await query.refetch();
        const workOrder = result.data?.workOrder;

        if (!workOrder) return;

        router.push('WorkOrder', { initial: workOrderToCreateWorkOrder(workOrder) });
      },
      leftSide: {
        label: name,
        subtitle: orderNamesSubtitle ? [moneySubtitle, orderNamesSubtitle] : [moneySubtitle],
        badges: [
          {
            variant: 'neutral',
            text: customer.name,
          },
          {
            variant: 'highlight',
            text: status,
          },
          {
            variant: 'warning',
            text: `Due ${dueDateString}`,
          },
          ...(isOverdue ? ([{ variant: 'critical', text: 'Overdue' }] as const) : []),
          {
            variant: 'highlight',
            text: financialStatus,
          },
        ],
      },
      rightSide: {
        showChevron: true,
      },
    };
  });
}
