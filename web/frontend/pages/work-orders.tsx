import {
  Badge,
  Card,
  EmptyState,
  Frame,
  IndexFilters,
  IndexFiltersMode,
  IndexTable,
  Page,
  SkeletonBodyText,
  Text,
} from '@shopify/polaris';
import { PermissionBoundary } from '../components/PermissionBoundary.js';
import { Loading, TitleBar, useAppBridge } from '@shopify/app-bridge-react';
import { useToast } from '@teifi-digital/shopify-app-react';
import { useAuthenticatedFetch } from '../hooks/use-authenticated-fetch.js';
import { useSettingsQuery } from '@work-orders/common/queries/use-settings-query.js';
import { emptyState } from '@web/frontend/assets/index.js';
import { Redirect } from '@shopify/app-bridge/actions';
import { titleCase } from '@teifi-digital/shopify-app-toolbox/string';
import { useEffect, useState } from 'react';
import { useDebouncedState } from '../hooks/use-debounced-state.js';
import { hasPropertyValue } from '@teifi-digital/shopify-app-toolbox/guards';
import { useWorkOrderInfoQuery } from '@work-orders/common/queries/use-work-order-info-query.js';
import { useCustomerQueries } from '@work-orders/common/queries/use-customer-query.js';
import { unique } from '@teifi-digital/shopify-app-toolbox/array';

export default function () {
  return (
    <Frame>
      <Page narrowWidth>
        <PermissionBoundary permissions={['read_work_orders']}>
          <WorkOrders />
        </PermissionBoundary>
      </Page>
    </Frame>
  );
}

function WorkOrders() {
  const app = useAppBridge();

  const [query, setQuery, internalQuery] = useDebouncedState('');
  const [page, setPage] = useState(0);
  const [mode, setMode] = useState<IndexFiltersMode>(IndexFiltersMode.Default);

  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });

  const workOrderInfoQuery = useWorkOrderInfoQuery({
    fetch,
    query,
    customFieldFilters: [],
  });
  const workOrders = workOrderInfoQuery.data?.pages?.[page] ?? [];

  useEffect(() => {
    if (workOrderInfoQuery.data?.pages.length === 1) {
      workOrderInfoQuery.fetchNextPage();
    }
  }, [workOrderInfoQuery.data?.pages.length]);

  const customerIds = unique(workOrders.map(workOrder => workOrder.customerId));
  const customerQueries = useCustomerQueries({ fetch, ids: customerIds });

  const settingsQuery = useSettingsQuery({ fetch });

  if (settingsQuery.isLoading) {
    return <Loading />;
  }

  const redirectToWorkOrder = (workOrderName: 'new' | string) => {
    Redirect.create(app).dispatch(Redirect.Action.APP, `/work-orders/${encodeURIComponent(workOrderName)}`);
  };

  const shouldFetchNextPage = workOrderInfoQuery.data && page === workOrderInfoQuery.data.pages.length - 2;
  const hasNextPage = !workOrderInfoQuery.isFetching && page < (workOrderInfoQuery.data?.pages.length ?? 0) - 1;

  return (
    <>
      <TitleBar
        title="Work Orders"
        primaryAction={{
          content: 'New Work Order',
          onAction: () => redirectToWorkOrder('new'),
        }}
      />

      <IndexFilters
        mode={mode}
        setMode={setMode}
        filters={[]}
        appliedFilters={[]}
        onQueryChange={query => setQuery(query)}
        onQueryClear={() => setQuery('', true)}
        queryValue={internalQuery}
        onClearAll={() => setQuery('', true)}
        tabs={[{ content: 'All', id: 'all' }]}
        canCreateNewView={false}
        selected={0}
      />
      <IndexTable
        headings={[
          { title: 'Work Order' },
          { title: 'Status' },
          { title: 'Customer' },
          { title: 'SO #' },
          { title: 'PO #' },
        ]}
        itemCount={workOrders.length}
        loading={workOrderInfoQuery.isFetchingNextPage}
        emptyState={
          !workOrderInfoQuery.isFetchingNextPage && (
            <Card>
              <EmptyState
                heading={'Work Order'}
                image={emptyState}
                action={{
                  content: 'Create work order',
                  onAction: () => redirectToWorkOrder('new'),
                }}
              >
                Track and manage your inventory.
              </EmptyState>
            </Card>
          )
        }
        pagination={{
          hasNext: hasNextPage,
          hasPrevious: page > 0,
          onPrevious: () => setPage(page => page - 1),
          onNext: () => {
            if (shouldFetchNextPage) {
              workOrderInfoQuery.fetchNextPage();
            }

            setPage(page => page + 1);
          },
        }}
      >
        {workOrders.map((workOrder, i) => (
          <IndexTable.Row
            key={workOrder.name}
            id={workOrder.name}
            position={i}
            onClick={() => redirectToWorkOrder(workOrder.name)}
          >
            <IndexTable.Cell>
              <Text as={'p'} fontWeight={'bold'} variant="bodyMd">
                {workOrder.name}
              </Text>
            </IndexTable.Cell>
            <IndexTable.Cell>
              <Badge tone={'info'}>{titleCase(workOrder.status)}</Badge>
            </IndexTable.Cell>
            <IndexTable.Cell>
              {(() => {
                const customerQuery = customerQueries[workOrder.customerId];

                if (!customerQuery) {
                  return null;
                }

                if (customerQuery.isLoading) {
                  return <SkeletonBodyText lines={1} />;
                }

                return customerQuery.data?.displayName;
              })()}
            </IndexTable.Cell>
            <IndexTable.Cell>
              <Text as={'p'} variant="bodyMd">
                {workOrder.orders
                  .filter(hasPropertyValue('type', 'ORDER'))
                  .map(order => order.name)
                  .join(', ')}
              </Text>
            </IndexTable.Cell>
            <IndexTable.Cell>
              <Text as={'p'} variant="bodyMd">
                {(() => {
                  const purchaseOrderNames = unique(
                    workOrder.items
                      .filter(hasPropertyValue('type', 'product'))
                      .flatMap(item => item.purchaseOrders.map(po => po.name)),
                  );

                  return purchaseOrderNames.join(', ');
                })()}
              </Text>
            </IndexTable.Cell>
          </IndexTable.Row>
        ))}
      </IndexTable>
      {toast}
    </>
  );
}