import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { useDebouncedState } from '@work-orders/common-pos/hooks/use-debounced-state.js';
import { useCycleCountPageQuery } from '@work-orders/common/queries/use-cycle-count-page-query.js';
import { BadgeProps, Button, List, ListRow, Text, useExtensionApi } from '@shopify/retail-ui-extensions-react';
import { ResponsiveStack } from '@teifi-digital/pos-tools/components/ResponsiveStack.js';
import { useRouter } from '../routes.js';
import { ControlledSearchBar } from '@teifi-digital/pos-tools/components/ControlledSearchBar.js';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { useEffect, useState } from 'react';
import { useScreen } from '@teifi-digital/pos-tools/router';
import { useCycleCountQuery } from '@work-orders/common/queries/use-cycle-count-query.js';
import { sum, unique } from '@teifi-digital/shopify-app-toolbox/array';
import { CycleCountApplicationStatus, DetailedCycleCount } from '@web/services/cycle-count/types.js';
import { getCreateCycleCountFromDetailedCycleCount } from '../create-cycle-count/get-create-cycle-count-from-detailed-cycle-count.js';
import { getDefaultCreateCycleCount } from '../create-cycle-count/default.js';
import { createGid, ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { ResponsiveGrid } from '@teifi-digital/pos-tools/components/ResponsiveGrid.js';
import { useLocationQueries, useLocationQuery } from '@work-orders/common/queries/use-location-query.js';
import { isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { useEmployeeQueries, useEmployeeQuery } from '@work-orders/common/queries/use-employee-query.js';

export function Entry() {
  const [query, setQuery] = useDebouncedState('');
  const [status, setStatus] = useState<string>();
  const [locationId, setLocationId] = useState<ID>();
  const [employeeId, setEmployeeId] = useState<ID>();
  const fetch = useAuthenticatedFetch();

  const locationQuery = useLocationQuery({ fetch, id: locationId! }, { enabled: !!locationId });
  const location = locationQuery.data;

  const employeeQuery = useEmployeeQuery({ fetch, id: employeeId ?? null });
  const employee = employeeQuery.data;

  const cycleCountPageQuery = useCycleCountPageQuery({
    fetch,
    filters: {
      query,
      status,
      locationId,
      employeeId,
    },
  });

  const router = useRouter();

  const [selectedCycleCountName, setSelectedCycleCountName] = useState<string>();
  const selectedCycleCountQuery = useCycleCountQuery({ fetch, name: selectedCycleCountName ?? null }, { staleTime: 0 });

  const screen = useScreen();
  screen.setIsLoading(selectedCycleCountQuery.isFetching);

  const { session } = useExtensionApi<'pos.home.modal.render'>();

  useEffect(() => {
    if (selectedCycleCountQuery.data && !selectedCycleCountQuery.isFetching) {
      const initial = getCreateCycleCountFromDetailedCycleCount(selectedCycleCountQuery.data);
      router.push('CycleCount', { initial });
      setSelectedCycleCountName(undefined);
    }
  }, [selectedCycleCountQuery.data, selectedCycleCountQuery.isFetching]);

  const rows = useListRows(cycleCountPageQuery.data?.pages.flat() ?? [], setSelectedCycleCountName);

  return (
    <ResponsiveStack direction={'vertical'} spacing={2}>
      <ResponsiveStack
        direction={'horizontal'}
        alignment={'space-between'}
        sm={{ direction: 'vertical', alignment: 'center' }}
      >
        <ResponsiveStack direction={'horizontal'} sm={{ alignment: 'center', paddingVertical: 'Small' }}>
          <Text variant="headingLarge">Cycle Counts</Text>
        </ResponsiveStack>

        <ResponsiveStack direction={'horizontal'} sm={{ direction: 'vertical' }}>
          <Button
            title={'New Cycle Count'}
            type={'primary'}
            onPress={() =>
              router.push('CycleCount', {
                initial: getDefaultCreateCycleCount(
                  createGid('Location', session.currentSession.locationId.toString()),
                ),
              })
            }
          />
        </ResponsiveStack>
      </ResponsiveStack>

      <ResponsiveStack direction={'horizontal'} alignment={'center'} flex={1} paddingHorizontal={'HalfPoint'}>
        <Text variant="body" color="TextSubdued">
          {cycleCountPageQuery.isRefetching ? 'Loading...' : ' '}
        </Text>
      </ResponsiveStack>

      <ResponsiveGrid columns={2}>
        <Button
          title={'Filter by status' + (status ? ` (${status})` : '')}
          onPress={() => router.push('StatusSelector', { onSelect: setStatus, onClear: () => setStatus(undefined) })}
        />
        <Button
          title={'Filter by location' + (locationId ? ` (${location?.name ?? 'loading...'})` : '')}
          onPress={() =>
            router.push('LocationSelector', {
              selection: {
                type: 'select',
                onSelect: location => setLocationId(location.id),
              },
            })
          }
        />
        <Button
          title={'Filter by employee' + (employeeId ? ` (${employee?.name ?? 'loading...'})` : '')}
          onPress={() =>
            router.push('EmployeeSelector', {
              selection: {
                type: 'select',
                onSelect: setEmployeeId,
              },
              onClear: () => setEmployeeId(undefined),
            })
          }
        />
      </ResponsiveGrid>

      <ControlledSearchBar
        value={query}
        onTextChange={query => setQuery(query, !query)}
        onSearch={() => {}}
        placeholder={'Search cycle counts'}
      />

      <List
        imageDisplayStrategy={'never'}
        data={rows}
        onEndReached={cycleCountPageQuery.fetchNextPage}
        isLoadingMore={cycleCountPageQuery.isFetchingNextPage}
      />

      {cycleCountPageQuery.isLoading && (
        <ResponsiveStack direction="horizontal" alignment="center" flex={1} paddingVertical="ExtraLarge">
          <Text variant="body" color="TextSubdued">
            Loading cycle counts...
          </Text>
        </ResponsiveStack>
      )}

      {cycleCountPageQuery.isSuccess && cycleCountPageQuery.data?.pages.length === 0 && (
        <ResponsiveStack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
          <Text variant="body" color="TextSubdued">
            No cycle counts found
          </Text>
        </ResponsiveStack>
      )}

      {cycleCountPageQuery.isError && (
        <ResponsiveStack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
          <Text color="TextCritical" variant="body">
            {extractErrorMessage(cycleCountPageQuery.error, 'An error occurred while loading cycle counts')}
          </Text>
        </ResponsiveStack>
      )}
    </ResponsiveStack>
  );
}

function useListRows(cycleCounts: DetailedCycleCount[], setSelectedCycleCountName: (name: string) => void) {
  const fetch = useAuthenticatedFetch();

  const locationIds = unique(cycleCounts.map(cycleCount => cycleCount.locationId));
  const locationQueries = useLocationQueries({ fetch, ids: locationIds });

  const employeeIds = unique(
    cycleCounts.flatMap(cycleCount => cycleCount.employeeAssignments.map(assignment => assignment.employeeId)),
  );
  const employeeQueries = useEmployeeQueries({ fetch, ids: employeeIds });

  return cycleCounts.map<ListRow>(cycleCount => {
    const location = locationQueries[cycleCount.locationId]?.data;

    return {
      id: cycleCount.name,
      onPress: () => setSelectedCycleCountName(cycleCount.name),
      leftSide: {
        label: cycleCount.name,
        image: {
          badge: sum(cycleCount.items.map(item => item.countQuantity)),
        },
        badges: [
          {
            text: cycleCount.status,
            variant: 'highlight',
          },
          getCycleCountApplicationStateBadge(cycleCount.applicationStatus),
          ...cycleCount.employeeAssignments
            .map<BadgeProps | null>(({ employeeId }) => {
              const employeeQuery = employeeQueries[employeeId];
              if (employeeQuery?.isLoading) return null;
              return { text: employeeQuery?.data?.name ?? 'Unknown employee', variant: 'neutral' };
            })
            .filter(isNonNullable),
          ...[location]
            .filter(isNonNullable)
            .map<BadgeProps>(location => ({ text: location.name, variant: 'neutral' })),
        ],
      },
      rightSide: {
        showChevron: true,
      },
    };
  });
}

/**
 * Create a badge for some application status.
 * If the count quantity and applied quantity are not equal the status will be adjusted to indicate this by transforming applied into partially applied.
 */
export function getCycleCountApplicationStateBadge(
  applicationStatus: CycleCountApplicationStatus,
  quantities?: {
    countQuantity: number;
    appliedQuantity: number;
  },
): BadgeProps {
  const changed = quantities?.appliedQuantity !== quantities?.countQuantity;

  if (applicationStatus === 'NOT_APPLIED') {
    return { text: 'Not Applied', variant: 'highlight', status: 'empty' };
  }

  if (applicationStatus === 'PARTIALLY_APPLIED' || (applicationStatus === 'APPLIED' && changed)) {
    let text = 'Partially Applied';

    if (quantities) {
      text += ` (${quantities.appliedQuantity})`;
    }

    return { text, variant: 'highlight', status: 'partial' };
  }

  if (applicationStatus === 'APPLIED') {
    return { text: 'Applied', variant: 'success', status: 'complete' };
  }

  return applicationStatus satisfies never;
}
