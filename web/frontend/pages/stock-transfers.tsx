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
import { useState, useEffect } from 'react';
import { useDebouncedState } from '../hooks/use-debounced-state.js';
import { emptyState } from '@web/frontend/assets/index.js';
import { useStockTransferPageQuery } from '@work-orders/common/queries/use-stock-transfer-page-query.js';
import { entries } from '@teifi-digital/shopify-app-toolbox/object';
import { StockTransferLineItemStatus } from '@web/services/db/queries/generated/stock-transfers.sql.js';
import { useLocationQueries } from '@work-orders/common/queries/use-location-query.js';
import { unique } from '@teifi-digital/shopify-app-toolbox/array';

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
  const [page, setPage] = useState(0);

  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });

  const stockTransferQuery = useStockTransferPageQuery({
    fetch,
    query,
    limit: 25,
  });

  useEffect(() => {
    if (stockTransferQuery.data?.pages.length === 1) {
      stockTransferQuery.fetchNextPage();
    }
  }, [stockTransferQuery.data?.pages.length]);

  const stockTransfers = stockTransferQuery.data?.pages ?? [];

  const fromLocationIds = unique(stockTransfers.map(transfer => transfer.fromLocationId).filter(Boolean));
  const toLocationIds = unique(stockTransfers.map(transfer => transfer.toLocationId).filter(Boolean));

  const fromLocationQueries = useLocationQueries({ fetch, ids: fromLocationIds });
  const toLocationQueries = useLocationQueries({ fetch, ids: toLocationIds });

  const redirectToStockTransfer = (type: 'incoming' | 'outgoing' | string) => {
    if (type === 'incoming' || type === 'outgoing') {
      Redirect.create(app).dispatch(Redirect.Action.APP, `/stock-transfers/new?type=${type}`);
    } else {
      Redirect.create(app).dispatch(Redirect.Action.APP, `/stock-transfers/${encodeURIComponent(type)}`);
    }
  };

  const shouldFetchNextPage = stockTransferQuery.data && page === stockTransferQuery.data.pages.length - 2;
  const hasNextPage = !stockTransferQuery.isFetching && page < (stockTransferQuery.data?.pages.length ?? 0) - 1;

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
        headings={[
          { title: 'Transfer #' },
          { title: 'Status' },
          { title: 'From location' },
          { title: 'To location' },
          { title: 'Items' },
        ]}
        itemCount={stockTransfers.length}
        loading={stockTransferQuery.isFetchingNextPage}
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
          hasNext: hasNextPage,
          hasPrevious: page > 0,
          onPrevious: () => setPage(page => page - 1),
          onNext: () => {
            if (shouldFetchNextPage) {
              stockTransferQuery.fetchNextPage();
            }
            setPage(page => page + 1);
          },
        }}
      >
        {stockTransfers.map((stockTransfer, i) => {
          const statusCount = stockTransfer.lineItems.reduce(
            (acc, item) => {
              if (item?.status && item?.quantity) {
                acc[item.status] += item.quantity;
              }
              return acc;
            },
            {
              IN_TRANSIT: 0,
              PENDING: 0,
              RECEIVED: 0,
              REJECTED: 0,
            } satisfies Record<StockTransferLineItemStatus, number>,
          );

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
                      {`${status} (${quantity})`}
                    </Badge>
                  ))}
              </IndexTable.Cell>
              <IndexTable.Cell>
                {fromLocationQueries[stockTransfer.fromLocationId]?.data?.name ?? stockTransfer.fromLocationId}
              </IndexTable.Cell>
              <IndexTable.Cell>
                {toLocationQueries[stockTransfer.toLocationId]?.data?.name ?? stockTransfer.toLocationId}
              </IndexTable.Cell>
              <IndexTable.Cell>{stockTransfer.lineItems.length}</IndexTable.Cell>
            </IndexTable.Row>
          );
        })}
      </IndexTable>

      {toast}
    </>
  );
}
