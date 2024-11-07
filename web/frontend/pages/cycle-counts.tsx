import {
  Page,
  IndexTable,
  IndexFilters,
  IndexFiltersMode,
  Text,
  Badge,
  Card,
  EmptyState,
  ChoiceList,
  Frame,
} from '@shopify/polaris';
import { TitleBar, useAppBridge } from '@shopify/app-bridge-react';
import { useCycleCountPageQuery } from '@work-orders/common/queries/use-cycle-count-page-query.js';
import { useState } from 'react';
import { useDebouncedState } from '../hooks/use-debounced-state.js';
import { useAuthenticatedFetch } from '../hooks/use-authenticated-fetch.js';
import { useToast } from '@teifi-digital/shopify-app-react';
import { Redirect } from '@shopify/app-bridge/actions';
import { emptyState } from '@web/frontend/assets/index.js';
import { PermissionBoundary } from '../components/PermissionBoundary.js';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';

export default function () {
  return (
    <Frame>
      <Page>
        <PermissionBoundary permissions={['read_work_orders']}>
          <CycleCounts />
        </PermissionBoundary>
      </Page>
    </Frame>
  );
}

function CycleCounts() {
  const app = useAppBridge();
  const [query, setQuery, internalQuery] = useDebouncedState('');
  const [status, setStatus] = useState<string>();
  const [locationId, setLocationId] = useState<ID>();
  const [employeeId, setEmployeeId] = useState<ID>();
  const [page, setPage] = useState(0);
  const [mode, setMode] = useState<IndexFiltersMode>(IndexFiltersMode.Default);

  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });

  const {
    data: cycleCounts,
    isLoading,
    fetchNextPage,
    isFetchingNextPage,
  } = useCycleCountPageQuery({
    fetch,
    filters: {
      query,
      status,
      locationId,
      employeeId,
      sortMode: 'created-date',
      sortOrder: 'descending',
    },
  });

  const redirectToCycleCount = (cycleCountName: 'new' | string) => {
    Redirect.create(app).dispatch(Redirect.Action.APP, `/cycle-counts/${encodeURIComponent(cycleCountName)}`);
  };

  const shouldFetchNextPage = cycleCounts && page === cycleCounts.pages.length - 2;
  const hasNextPageLocal = !isFetchingNextPage && page < (cycleCounts?.pages.length ?? 0) - 1;

  return (
    <>
      <TitleBar
        title="Cycle Counts"
        primaryAction={{
          content: 'New cycle count',
          onAction: () => redirectToCycleCount('new'),
        }}
      />

      <IndexFilters
        mode={mode}
        setMode={setMode}
        queryValue={internalQuery}
        queryPlaceholder="Search cycle counts"
        onQueryChange={query => setQuery(query)}
        onQueryClear={() => setQuery('', true)}
        tabs={[{ content: 'All', id: 'all' }]}
        selected={0}
        filters={[
          {
            key: 'status',
            label: 'Status',
            filter: (
              <ChoiceList
                title="Status"
                choices={[
                  { label: 'Draft', value: 'Draft' },
                  { label: 'In Progress', value: 'InProgress' },
                  { label: 'Complete', value: 'Complete' },
                ]}
                selected={status ? [status] : []}
                onChange={([selected]) => setStatus(selected)}
              />
            ),
          },
        ]}
        onClearAll={() => {
          setQuery('', true);
          setStatus(undefined);
          setLocationId(undefined);
          setEmployeeId(undefined);
        }}
      />

      <IndexTable
        headings={[
          { title: 'Name' },
          { title: 'Status' },
          { title: 'Location' },
          { title: 'Due Date' },
          { title: 'Items' },
        ]}
        itemCount={cycleCounts?.pages[page]?.length ?? 0}
        loading={isLoading}
        emptyState={
          <Card>
            <EmptyState
              heading="Create your first cycle count"
              action={{
                content: 'Create cycle count',
                onAction: () => redirectToCycleCount('new'),
              }}
              image={emptyState}
            >
              <p>Track and manage your inventory counts.</p>
            </EmptyState>
          </Card>
        }
        pagination={{
          hasNext: hasNextPageLocal,
          hasPrevious: page > 0,
          onPrevious: () => setPage(page => page - 1),
          onNext: () => {
            if (shouldFetchNextPage) {
              fetchNextPage();
            }
            setPage(page => page + 1);
          },
        }}
      >
        {cycleCounts?.pages[page]?.map((count, index) => (
          <IndexTable.Row
            id={count.name}
            key={count.name}
            position={index}
            onClick={() => redirectToCycleCount(count.name)}
          >
            <IndexTable.Cell>
              <Text variant="bodyMd" fontWeight="bold" as="span">
                {count.name}
              </Text>
            </IndexTable.Cell>
            <IndexTable.Cell>
              <Badge progress={count.status === 'Draft' ? 'incomplete' : 'complete'}>{count.status}</Badge>
            </IndexTable.Cell>
            <IndexTable.Cell>{count.locationId}</IndexTable.Cell>
            <IndexTable.Cell>{count.dueDate ? new Date(count.dueDate).toLocaleDateString() : '-'}</IndexTable.Cell>
            <IndexTable.Cell>{count.items.length}</IndexTable.Cell>
          </IndexTable.Row>
        ))}
      </IndexTable>

      {toast}
    </>
  );
}
