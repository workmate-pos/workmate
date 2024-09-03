import {
  Badge,
  Card,
  EmptyState,
  Frame,
  IndexFilters,
  IndexFiltersMode,
  IndexTable,
  Page,
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
import { useSpecialOrdersQuery } from '@work-orders/common/queries/use-special-orders-query.js';

export default function () {
  return (
    <Frame>
      <Page>
        <PermissionBoundary permissions={['read_special_orders']}>
          <SpecialOrders />
        </PermissionBoundary>
      </Page>
    </Frame>
  );
}

function SpecialOrders() {
  const app = useAppBridge();

  const [query, setQuery, internalQuery] = useDebouncedState('');
  const [page, setPage] = useState(0);
  const [mode, setMode] = useState<IndexFiltersMode>(IndexFiltersMode.Default);

  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });

  const specialOrderInfoQuery = useSpecialOrdersQuery({
    fetch,
    params: { query, limit: 25 },
  });
  const specialOrders = specialOrderInfoQuery.data?.pages?.[page] ?? [];

  useEffect(() => {
    if (specialOrderInfoQuery.data?.pages.length === 1) {
      specialOrderInfoQuery.fetchNextPage();
    }
  }, [specialOrderInfoQuery.data?.pages.length]);

  useEffect(() => {
    specialOrderInfoQuery.fetchNextPage();
  }, []);

  const settingsQuery = useSettingsQuery({ fetch });

  if (settingsQuery.isLoading) {
    return <Loading />;
  }

  const redirectToSpecialOrder = (specialOrderName: 'new' | string) => {
    Redirect.create(app).dispatch(Redirect.Action.APP, `/special-orders/${encodeURIComponent(specialOrderName)}`);
  };

  const shouldFetchNextPage = specialOrderInfoQuery.data && page === specialOrderInfoQuery.data.pages.length - 2;
  const hasNextPage = !specialOrderInfoQuery.isFetching && page < (specialOrderInfoQuery.data?.pages.length ?? 0) - 1;

  return (
    <>
      <TitleBar
        title="Special Orders"
        primaryAction={
          false
            ? {
                content: 'New Special Order',
                onAction: () => redirectToSpecialOrder('new'),
              }
            : undefined
        }
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
          { title: 'Special Order' },
          { title: 'Order State' },
          { title: 'PO State' },
          { title: 'Location' },
          { title: 'Customer' },
          { title: 'PO #' },
          { title: 'SO #' },
          { title: 'WO #' },
        ]}
        itemCount={specialOrders.length}
        loading={specialOrderInfoQuery.isLoading}
        emptyState={
          <Card>
            <EmptyState
              heading={'Special Orders'}
              image={emptyState}
              action={{
                content: 'Create special orders through Work Orders',
                onAction: () => Redirect.create(app).dispatch(Redirect.Action.APP, '/work-orders'),
              }}
            >
              Track and manage your special orders.
            </EmptyState>
          </Card>
        }
        pagination={{
          hasNext: hasNextPage,
          hasPrevious: page > 0,
          onPrevious: () => setPage(page => page - 1),
          onNext: () => {
            if (shouldFetchNextPage) {
              specialOrderInfoQuery.fetchNextPage();
            }

            setPage(page => page + 1);
          },
        }}
      >
        {specialOrders.map((specialOrder, i) => (
          <IndexTable.Row
            key={specialOrder.name}
            id={specialOrder.name}
            position={i}
            onClick={() => redirectToSpecialOrder(specialOrder.name)}
          >
            <IndexTable.Cell>
              <Text as={'p'} fontWeight={'bold'} variant="bodyMd">
                {specialOrder.name}
              </Text>
            </IndexTable.Cell>
            <IndexTable.Cell>
              <Badge tone={'info'}>{titleCase(specialOrder.orderState)}</Badge>
            </IndexTable.Cell>
            <IndexTable.Cell>
              {specialOrder.purchaseOrders.length > 0 && (
                <Badge tone={'info'}>{titleCase(specialOrder.purchaseOrderState)}</Badge>
              )}
            </IndexTable.Cell>
            <IndexTable.Cell>
              <Text as={'p'} variant="bodyMd">
                {specialOrder.location?.name}
              </Text>
            </IndexTable.Cell>
            <IndexTable.Cell>
              <Text as={'p'} variant="bodyMd">
                {specialOrder.customer.displayName}
              </Text>
            </IndexTable.Cell>
            <IndexTable.Cell>
              <Text as={'p'} variant="bodyMd">
                {specialOrder.purchaseOrders.map(order => order.name).join(', ')}
              </Text>
            </IndexTable.Cell>
            <IndexTable.Cell>
              <Text as={'p'} variant="bodyMd">
                {specialOrder.orders.map(order => order.name).join(', ')}
              </Text>
            </IndexTable.Cell>
            <IndexTable.Cell>
              <Text as={'p'} variant="bodyMd">
                {specialOrder.workOrders.map(order => order.name).join(', ')}
              </Text>
            </IndexTable.Cell>
          </IndexTable.Row>
        ))}
      </IndexTable>

      {toast}
    </>
  );
}
