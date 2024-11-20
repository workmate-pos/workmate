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
import { Loading, TitleBar, useAppBridge } from '@shopify/app-bridge-react';
import { useToast } from '@teifi-digital/shopify-app-react';
import { useAuthenticatedFetch } from '../hooks/use-authenticated-fetch.js';
import { PermissionBoundary } from '../components/PermissionBoundary.js';
import { Redirect } from '@shopify/app-bridge/actions';
import { useState } from 'react';
import { useDebouncedState } from '../hooks/use-debounced-state.js';
import { emptyState } from '@web/frontend/assets/index.js';
import { useStockTransferPageQuery } from '@work-orders/common/queries/use-stock-transfer-page-query.js';
import { entries } from '@teifi-digital/shopify-app-toolbox/object';
import { StockTransferLineItemStatus } from '@web/services/db/queries/generated/stock-transfers.sql.js';
import { useLocationQueries } from '@work-orders/common/queries/use-location-query.js';
import { unique } from '@teifi-digital/shopify-app-toolbox/array';
import { getInfiniteQueryPagination } from '@web/frontend/util/pagination.js';
import { sentenceCase } from '@teifi-digital/shopify-app-toolbox/string';

export default function () {
  return (
    <Frame>
      <Page fullWidth>
        <PermissionBoundary permissions={['read_stock_transfers', 'read_settings']}>
          <StockTransfers />
        </PermissionBoundary>
      </Page>
    </Frame>
  );
}

function StockTransfers() {
  const app = useAppBridge();
  const [query, setQuery, internalQuery] = useDebouncedState('');
  const [mode, setMode] = useState<IndexFiltersMode>(IndexFiltersMode.Default);

  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });

  const stockTransferQuery = useStockTransferPageQuery({
    fetch,
    query,
    limit: 50,
  });

  const redirectToStockTransfer = (type: 'incoming' | 'outgoing' | string) => {
    if (type === 'incoming' || type === 'outgoing') {
      Redirect.create(app).dispatch(Redirect.Action.APP, `/stock-transfers/new?type=${type}`);
    } else {
      Redirect.create(app).dispatch(Redirect.Action.APP, `/stock-transfers/${encodeURIComponent(type)}`);
    }
  };

  const [pageIndex, setPageIndex] = useState(0);
  const pagination = getInfiniteQueryPagination(pageIndex, setPageIndex, stockTransferQuery);
  const allStockTransfers = stockTransferQuery.data?.pages.flat() ?? [];
  const stockTransfers = stockTransferQuery.data?.pages[pageIndex] ?? [];

  const locationIds = unique(allStockTransfers.flatMap(transfer => [transfer.fromLocationId, transfer.toLocationId]));
  const locationQueries = useLocationQueries({ fetch, ids: locationIds });

  if (stockTransferQuery.isLoading) {
    return <Loading />;
  }

  return (
    <>
      <TitleBar
        title="Stock transfers"
        secondaryActions={[
          {
            content: 'New incoming transfer',
            onAction: () => redirectToStockTransfer('incoming'),
          },
          {
            content: 'New outgoing transfer',
            onAction: () => redirectToStockTransfer('outgoing'),
          },
        ]}
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
        headings={[{ title: 'Transfer Order #' }, { title: 'Status' }, { title: 'From' }, { title: 'To' }]}
        itemCount={stockTransfers.length}
        loading={stockTransferQuery.isLoading}
        emptyState={
          <Card>
            <EmptyState
              heading="Stock transfer"
              image={emptyState}
              action={{
                content: 'Create stock transfer',
                onAction: () => redirectToStockTransfer('new'),
              }}
            >
              Transfer inventory between locations
            </EmptyState>
          </Card>
        }
        pagination={{
          hasNext: pagination.hasNextPage,
          hasPrevious: pagination.hasPreviousPage,
          onPrevious: () => pagination.previous(),
          onNext: () => pagination.next(),
        }}
      >
        {stockTransfers.map((stockTransfer, i) => {
          const statusCount: Record<StockTransferLineItemStatus, number> = {
            IN_TRANSIT: 0,
            PENDING: 0,
            RECEIVED: 0,
            REJECTED: 0,
          };

          for (const lineItem of stockTransfer.lineItems) {
            statusCount[lineItem.status] += lineItem.quantity;
          }

          return (
            <IndexTable.Row
              key={stockTransfer.name}
              id={stockTransfer.name}
              position={i}
              onClick={() => redirectToStockTransfer(stockTransfer.name)}
            >
              <IndexTable.Cell>
                <Text as="p" fontWeight="bold" variant="bodyMd">
                  {stockTransfer.name}
                </Text>
              </IndexTable.Cell>
              <IndexTable.Cell>
                {entries(statusCount)
                  .filter(([, quantity]) => quantity > 0)
                  .map(([status, quantity]) => (
                    <Badge key={status} tone="info">
                      {`${sentenceCase(status)} (${quantity})`}
                    </Badge>
                  ))}
              </IndexTable.Cell>
              <IndexTable.Cell>{locationQueries[stockTransfer.fromLocationId]?.data?.name}</IndexTable.Cell>
              <IndexTable.Cell>{locationQueries[stockTransfer.toLocationId]?.data?.name}</IndexTable.Cell>
            </IndexTable.Row>
          );
        })}
      </IndexTable>

      {toast}
    </>
  );
}
