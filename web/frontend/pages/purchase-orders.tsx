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
import { usePurchaseOrderInfoPageQuery } from '@work-orders/common/queries/use-purchase-order-info-page-query.js';
import { useSettingsQuery } from '@work-orders/common/queries/use-settings-query.js';
import { emptyState } from '@web/frontend/assets/index.js';
import { Redirect } from '@shopify/app-bridge/actions';
import { titleCase } from '@teifi-digital/shopify-app-toolbox/string';
import { useState } from 'react';
import { useDebouncedState } from '../hooks/use-debounced-state.js';
import { hasPropertyValue } from '@teifi-digital/shopify-app-toolbox/guards';

export default function () {
  return (
    <Frame>
      <Page narrowWidth>
        <PermissionBoundary permissions={['read_purchase_orders']}>
          <PurchaseOrders />
        </PermissionBoundary>
      </Page>
    </Frame>
  );
}

function PurchaseOrders() {
  const app = useAppBridge();

  const [query, setQuery, internalQuery] = useDebouncedState('');
  const [mode, setMode] = useState<IndexFiltersMode>(IndexFiltersMode.Default);

  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });

  const purchaseOrderInfoQuery = usePurchaseOrderInfoPageQuery({
    fetch,
    query,
    customFieldFilters: [],
  });
  const purchaseOrders = purchaseOrderInfoQuery.data?.pages ?? [];

  const settingsQuery = useSettingsQuery({ fetch });

  if (settingsQuery.isLoading) {
    return <Loading />;
  }

  return (
    <>
      <TitleBar
        title="Purchase Orders"
        primaryAction={{
          content: 'New Purchase Order',
          onAction: () => Redirect.create(app).dispatch(Redirect.Action.APP, '/purchase-orders/new'),
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
          { title: 'Purchase Order' },
          { title: 'Status' },
          { title: 'Location' },
          { title: 'Customer' },
          { title: 'SO #' },
          { title: 'WO #' },
        ]}
        itemCount={purchaseOrders.length}
        loading={purchaseOrderInfoQuery.isLoading}
        emptyState={
          <Card>
            <EmptyState
              heading={'Purchase Orders'}
              image={emptyState}
              action={{
                content: 'Create purchase order',
                onAction() {
                  Redirect.create(app).dispatch(Redirect.Action.APP, '/purchase-orders/new');
                },
              }}
            >
              Track and manage your inventory.
            </EmptyState>
          </Card>
        }
      >
        {purchaseOrders.map((purchaseOrder, i) => (
          <IndexTable.Row
            key={purchaseOrder.name}
            id={purchaseOrder.name}
            position={i}
            onClick={() =>
              Redirect.create(app).dispatch(
                Redirect.Action.APP,
                `/purchase-orders/${encodeURIComponent(purchaseOrder.name)}`,
              )
            }
          >
            <IndexTable.Cell>
              <Text as={'p'} fontWeight={'bold'} variant="bodyMd">
                {purchaseOrder.name}
              </Text>
            </IndexTable.Cell>
            <IndexTable.Cell>
              <Badge tone={'info'}>{titleCase(purchaseOrder.status)}</Badge>
            </IndexTable.Cell>
            <IndexTable.Cell>
              <Text as={'p'} variant="bodyMd">
                {purchaseOrder.location?.name}
              </Text>
            </IndexTable.Cell>
            <IndexTable.Cell>
              <Text as={'p'} variant="bodyMd">
                {purchaseOrder.linkedCustomers.map(customer => customer.displayName).join(', ')}
              </Text>
            </IndexTable.Cell>
            <IndexTable.Cell>
              <Text as={'p'} variant="bodyMd">
                {purchaseOrder.linkedOrders
                  .filter(hasPropertyValue('orderType', 'ORDER'))
                  .map(order => order.name)
                  .join(', ')}
              </Text>
            </IndexTable.Cell>
            <IndexTable.Cell>
              <Text as={'p'} variant="bodyMd">
                {purchaseOrder.linkedWorkOrders.map(wo => wo.name).join(', ')}
              </Text>
            </IndexTable.Cell>
          </IndexTable.Row>
        ))}
      </IndexTable>
      {toast}
    </>
  );
}
