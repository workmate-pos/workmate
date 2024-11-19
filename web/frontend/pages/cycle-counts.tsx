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
import { useState, useEffect } from 'react';
import { useDebouncedState } from '../hooks/use-debounced-state.js';
import { useAuthenticatedFetch } from '../hooks/use-authenticated-fetch.js';
import { useToast } from '@teifi-digital/shopify-app-react';
import { Redirect } from '@shopify/app-bridge/actions';
import { emptyState } from '@web/frontend/assets/index.js';
import { PermissionBoundary } from '../components/PermissionBoundary.js';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { getInfiniteQueryPagination } from '@web/frontend/util/pagination.js';
import { useSettingsQuery } from '@work-orders/common/queries/use-settings-query.js';
import { useLocationsQuery } from '@work-orders/common/queries/use-locations-query.js';
import { useEmployeeQueries } from '@work-orders/common/queries/use-employee-query.js';
import { isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { unique } from '@teifi-digital/shopify-app-toolbox/array';
import { useLocationQueries } from '@work-orders/common/queries/use-location-query.js';
import { sentenceCase } from '@teifi-digital/shopify-app-toolbox/string';

export default function () {
  return (
    <Frame>
      <Page>
        <PermissionBoundary permissions={['read_settings', 'cycle_count']}>
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
  const [mode, setMode] = useState<IndexFiltersMode>(IndexFiltersMode.Default);

  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });
  const settingsQuery = useSettingsQuery({ fetch });

  const cycleCountQuery = useCycleCountPageQuery({
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

  const locationsQuery = useLocationsQuery({ fetch, params: { first: 50 } });
  const locations = locationsQuery.data?.pages.flat() ?? [];

  useEffect(() => {
    if (!locationsQuery.isFetching && locationsQuery.hasNextPage) {
      locationsQuery.fetchNextPage();
    }
  }, [locationsQuery.isFetching, locationsQuery.hasNextPage]);

  const [pageIndex, setPage] = useState(0);
  const pagination = getInfiniteQueryPagination(0, setPage, cycleCountQuery);
  const page = cycleCountQuery.data?.pages[pageIndex] ?? [];

  // Get unique employee IDs from all cycle counts' employee assignments
  const employeeIds = unique(
    page.flatMap(cycleCount => cycleCount.employeeAssignments.map(assignment => assignment.employeeId)),
  );

  // Get location IDs
  const locationIds = unique(page.flatMap(cycleCount => cycleCount.locationId));
  const locationQueries = useLocationQueries({ fetch, ids: locationIds });

  // Pass the collected IDs to useEmployeeQueries
  const employeeQueries = useEmployeeQueries({ fetch, ids: employeeIds });
  const employees = Object.values(employeeQueries)
    .map(query => query.data)
    .filter(isNonNullable);

  const redirectToCycleCount = (cycleCountName: 'new' | string) => {
    Redirect.create(app).dispatch(Redirect.Action.APP, `/cycle-counts/${encodeURIComponent(cycleCountName)}`);
  };

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
        tabs={[]}
        selected={0}
        filters={[
          {
            key: 'status',
            label: 'Status',
            filter: (
              <ChoiceList
                title="Status"
                choices={
                  settingsQuery.data?.settings.cycleCount.statuses.map(status => ({
                    label: status,
                    value: status,
                  })) ?? []
                }
                selected={status ? [status] : []}
                onChange={([selected]) => setStatus(selected)}
              />
            ),
          },
          {
            key: 'location',
            label: 'Location',
            filter: (
              <ChoiceList
                title="Location"
                choices={locations.map(location => ({
                  label: location.name,
                  value: location.id,
                }))}
                selected={locationId ? [locationId] : []}
                onChange={([selected]) => setLocationId(selected as ID)}
              />
            ),
          },
          {
            key: 'employee',
            label: 'Employee',
            filter: (
              <ChoiceList
                title="Employee"
                choices={employees.map(employee => ({
                  label: employee.name,
                  value: employee.id,
                }))}
                selected={employeeId ? [employeeId] : []}
                onChange={([selected]) => setEmployeeId(selected as ID)}
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
        appliedFilters={[
          status
            ? {
                key: 'status',
                label: `Status is ${status}`,
                onRemove: () => setStatus(undefined),
              }
            : null,
          locationId
            ? {
                key: 'location',
                label: `Location is ${locations.find(location => location.id === locationId)?.name ?? 'unknown'}`,
                onRemove: () => setLocationId(undefined),
              }
            : null,
          employeeId
            ? {
                key: 'employee',
                label: `Employee is ${employees.find(employee => employee.id === employeeId)?.name ?? 'unknown'}`,
                onRemove: () => setEmployeeId(undefined),
              }
            : null,
        ].filter(isNonNullable)}
      />

      <IndexTable
        headings={[
          { title: 'Name' },
          { title: 'Items' },
          { title: 'Status' },
          { title: 'Application Status' },
          { title: 'Location' },
          { title: 'Employees' },
          { title: 'Due Date' },
        ]}
        itemCount={page.length}
        loading={cycleCountQuery.isFetching}
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
              <Text as="p">Track and manage your inventory counts.</Text>
            </EmptyState>
          </Card>
        }
        pagination={{
          hasNext: pagination.hasNextPage,
          hasPrevious: pagination.hasPreviousPage,
          onNext: () => pagination.next(),
          onPrevious: () => pagination.previous(),
        }}
      >
        {page.map((count, index) => (
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
            <IndexTable.Cell>{count.items.length}</IndexTable.Cell>
            <IndexTable.Cell>
              <Badge tone="info">{sentenceCase(count.status)}</Badge>
            </IndexTable.Cell>
            <IndexTable.Cell>
              <Badge tone={count.applicationStatus === 'applied' ? 'success' : 'info'}>
                {sentenceCase(count.applicationStatus)}
              </Badge>
            </IndexTable.Cell>
            <IndexTable.Cell>{locationQueries[count.locationId]?.data?.name ?? count.locationId}</IndexTable.Cell>
            <IndexTable.Cell>
              {employees
                .filter(employee => count.employeeAssignments.some(assignment => assignment.employeeId === employee.id))
                .map(employee => employee.name)
                .join(', ')}
            </IndexTable.Cell>
            <IndexTable.Cell>{count.dueDate ? new Date(count.dueDate).toLocaleDateString() : ''}</IndexTable.Cell>
          </IndexTable.Row>
        ))}
      </IndexTable>

      {toast}
    </>
  );
}
