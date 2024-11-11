import {
  Badge,
  Card,
  EmptyState,
  Frame,
  IndexFilters,
  IndexFiltersMode,
  IndexTable,
  InlineStack,
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
import { useEffect, useState } from 'react';
import { useDebouncedState } from '../hooks/use-debounced-state.js';
import { hasPropertyValue, isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { PurchaseOrderCsvUploadDropZoneModal } from '@web/frontend/components/purchase-orders/PurchaseOrderCsvUploadDropZoneModal.js';
import { unique } from '@teifi-digital/shopify-app-toolbox/array';

export default function () {
  return (
    <Frame>
      <Page fullWidth>
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
  const [page, setPage] = useState(0);
  const [mode, setMode] = useState<IndexFiltersMode>(IndexFiltersMode.Default);
  const [isCsvUploadDropZoneModalOpen, setIsCsvUploadDropZoneModalOpen] = useState(false);

  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });

  const purchaseOrderInfoQuery = usePurchaseOrderInfoPageQuery({
    fetch,
    query,
    customFieldFilters: [],
  });
  const purchaseOrders = purchaseOrderInfoQuery.data?.pages?.[page] ?? [];

  useEffect(() => {
    if (purchaseOrderInfoQuery.data?.pages.length === 1) {
      purchaseOrderInfoQuery.fetchNextPage();
    }
  }, [purchaseOrderInfoQuery.data?.pages.length]);

  useEffect(() => {
    purchaseOrderInfoQuery.fetchNextPage();
  }, []);

  const settingsQuery = useSettingsQuery({ fetch });

  if (settingsQuery.isLoading) {
    return <Loading />;
  }

  const redirectToPurchaseOrder = (purchaseOrderName: 'new' | string) => {
    Redirect.create(app).dispatch(Redirect.Action.APP, `/purchase-orders/${encodeURIComponent(purchaseOrderName)}`);
  };

  const shouldFetchNextPage = purchaseOrderInfoQuery.data && page === purchaseOrderInfoQuery.data.pages.length - 2;
  const hasNextPage = !purchaseOrderInfoQuery.isFetching && page < (purchaseOrderInfoQuery.data?.pages.length ?? 0) - 1;

  return (
    <>
      <TitleBar
        title="Purchase orders"
        secondaryActions={[
          {
            content: 'Re-order',
            onAction: () => redirectToPurchaseOrder('reorder'),
          },
          {
            content: 'Import CSV',
            onAction: () => setIsCsvUploadDropZoneModalOpen(true),
          },
          {
            content: 'Merge special orders',
            onAction: () => redirectToPurchaseOrder('merge'),
          },
        ]}
        primaryAction={{
          content: 'New purchase order',
          onAction: () => redirectToPurchaseOrder('new'),
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
          { title: 'Purchase order' },
          { title: 'Status' },
          { title: 'Location' },
          { title: 'Customer' },
          { title: 'SPO #' },
          { title: 'SO #' },
          { title: 'WO #' },
        ]}
        itemCount={purchaseOrders.length}
        loading={purchaseOrderInfoQuery.isLoading}
        emptyState={
          <Card>
            <EmptyState
              heading={'Purchase orders'}
              image={emptyState}
              action={{
                content: 'Create purchase order',
                onAction: () => redirectToPurchaseOrder('new'),
              }}
            >
              Track and manage your inventory.
            </EmptyState>
          </Card>
        }
        pagination={{
          hasNext: hasNextPage,
          hasPrevious: page > 0,
          onPrevious: () => setPage(page => page - 1),
          onNext: () => {
            if (shouldFetchNextPage) {
              purchaseOrderInfoQuery.fetchNextPage();
            }

            setPage(page => page + 1);
          },
        }}
      >
        {purchaseOrders.map((purchaseOrder, i) => (
          <IndexTable.Row
            key={purchaseOrder.name}
            id={purchaseOrder.name}
            position={i}
            onClick={() => redirectToPurchaseOrder(purchaseOrder.name)}
          >
            <IndexTable.Cell>
              <Text as={'p'} fontWeight={'bold'} variant="bodyMd">
                {purchaseOrder.name}
              </Text>
            </IndexTable.Cell>
            <IndexTable.Cell>
              <Badge tone={'info'}>{purchaseOrder.status}</Badge>
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
              <InlineStack gap="100">
                {unique(
                  purchaseOrder.lineItems.map(lineItem => lineItem.specialOrderLineItem?.name).filter(isNonNullable),
                ).map(spo => (
                  <Badge tone="enabled">{spo}</Badge>
                ))}
              </InlineStack>
            </IndexTable.Cell>
            <IndexTable.Cell>
              <InlineStack gap="100">
                {purchaseOrder.linkedOrders
                  .filter(hasPropertyValue('orderType', 'ORDER'))
                  .map(order => order.name)
                  .map(sp => (
                    <Badge tone="enabled">{sp}</Badge>
                  ))}
              </InlineStack>
            </IndexTable.Cell>
            <IndexTable.Cell>
              <InlineStack gap="100">
                {purchaseOrder.linkedWorkOrders
                  .map(wo => wo.name)
                  .map(sp => (
                    <Badge tone="enabled">{sp}</Badge>
                  ))}
              </InlineStack>
            </IndexTable.Cell>
          </IndexTable.Row>
        ))}
      </IndexTable>

      <PurchaseOrderCsvUploadDropZoneModal
        open={isCsvUploadDropZoneModalOpen}
        onClose={() => setIsCsvUploadDropZoneModalOpen(false)}
      />

      {toast}
    </>
  );
}
