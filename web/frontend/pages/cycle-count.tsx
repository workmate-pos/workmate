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
import { getInfiniteQueryPagination } from '@web/frontend/util/pagination.js';
import { useSettingsQuery } from '@work-orders/common/queries/use-settings-query.js';
import { useEmployeeQueries } from '@work-orders/common/queries/use-employee-query.js';
import { isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { unique } from '@teifi-digital/shopify-app-toolbox/array';
import { sentenceCase } from '@teifi-digital/shopify-app-toolbox/string';
import { useAllLocationsQuery } from '@work-orders/common/queries/use-all-locations-query.js';

export default function () {
  return (
    <Frame>
      <Page fullWidth>
        <PermissionBoundary permissions={['read_settings', 'cycle_count']}>
          <CycleCount />
        </PermissionBoundary>
      </Page>
    </Frame>
  );
}

function CycleCount() {
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

  const locationsQuery = useAllLocationsQuery({ fetch });

  const [pageIndex, setPage] = useState(0);
  const pagination = getInfiniteQueryPagination(pageIndex, setPage, cycleCountQuery);
  const page = cycleCountQuery.data?.pages[pageIndex] ?? [];

  // Get unique employee IDs from all cycle counts' employee assignments
  const employeeIds = unique(
    page.flatMap(cycleCount => cycleCount.employeeAssignments.map(assignment => assignment.employeeId)),
  );

  // Pass the collected IDs to useEmployeeQueries
  const employeeQueries = useEmployeeQueries({ fetch, ids: employeeIds });
  const employees = Object.values(employeeQueries)
    .map(query => query.data)
    .filter(isNonNullable);

  const redirectToCycleCount = (cycleCountName: 'new' | string) => {
    Redirect.create(app).dispatch(Redirect.Action.APP, `/cycle-count/${encodeURIComponent(cycleCountName)}`);
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
                choices={
                  locationsQuery.data?.map(location => ({
                    label: location.name,
                    value: location.id,
                  })) ?? []
                }
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
                label: `Location is ${locationsQuery.data?.find(location => location.id === locationId)?.name ?? 'unknown'}`,
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
            <IndexTable.Cell>
              <Badge tone="info">{sentenceCase(count.status)}</Badge>
            </IndexTable.Cell>
            <IndexTable.Cell>
              <Badge tone={count.applicationStatus === 'applied' ? 'success' : 'info'}>
                {sentenceCase(count.applicationStatus)}
              </Badge>
            </IndexTable.Cell>
            <IndexTable.Cell>
              {locationsQuery.data?.find(location => location.id === count.locationId)?.name}
            </IndexTable.Cell>
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
