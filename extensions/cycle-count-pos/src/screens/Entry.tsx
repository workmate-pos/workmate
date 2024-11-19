import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { useDebouncedState } from '@work-orders/common-pos/hooks/use-debounced-state.js';
import { useCycleCountPageQuery } from '@work-orders/common/queries/use-cycle-count-page-query.js';
import {
  BadgeProps,
  Banner,
  Button,
  List,
  ListRow,
  Stack,
  Text,
  useApi,
} from '@shopify/ui-extensions-react/point-of-sale';
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
import { defaultCreateCycleCount } from '@work-orders/common/create-cycle-count/default.js';
import { createGid, ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { ResponsiveGrid } from '@teifi-digital/pos-tools/components/ResponsiveGrid.js';
import { useLocationQueries } from '@work-orders/common/queries/use-location-query.js';
import { isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { useEmployeeQueries } from '@work-orders/common/queries/use-employee-query.js';
import { SortMode, SortOrder } from './Filters.js';
import { useSettingsQuery } from '@work-orders/common/queries/use-settings-query.js';

export const DEFAULT_SORT_MODE: SortMode = 'created-date';
export const DEFAULT_SORT_ORDER: SortOrder = 'descending';

export function Entry() {
  const [query, setQuery] = useDebouncedState('');
  const [status, setStatus] = useState<string>();
  const [locationId, setLocationId] = useState<ID>();
  const [employeeId, setEmployeeId] = useState<ID>();

  const [sortMode, setSortMode] = useState<SortMode>('created-date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('descending');

  const activeFilterCount = [status, locationId, employeeId].filter(Boolean).length;

  const fetch = useAuthenticatedFetch();
  const cycleCountPageQuery = useCycleCountPageQuery({
    fetch,
    filters: {
      query,
      status,
      locationId,
      employeeId,
      sortMode,
      sortOrder,
    },
  });

  const router = useRouter();

  const [selectedCycleCountName, setSelectedCycleCountName] = useState<string>();
  const selectedCycleCountQuery = useCycleCountQuery({ fetch, name: selectedCycleCountName ?? null }, { staleTime: 0 });

  const screen = useScreen();
  screen.setIsLoading(selectedCycleCountQuery.isFetching);

  const { session } = useApi<'pos.home.modal.render'>();

  useEffect(() => {
    if (selectedCycleCountQuery.data && !selectedCycleCountQuery.isFetching) {
      const initial = getCreateCycleCountFromDetailedCycleCount(selectedCycleCountQuery.data);
      router.push('CycleCount', { initial });
      setSelectedCycleCountName(undefined);
    }
  }, [selectedCycleCountQuery.data, selectedCycleCountQuery.isFetching]);

  const rows = useListRows(cycleCountPageQuery.data?.pages.flat() ?? [], setSelectedCycleCountName);

  const settingsQuery = useSettingsQuery({ fetch });

  if (settingsQuery.isError) {
    return (
      <Stack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
        <Text color="TextCritical" variant="body">
          {extractErrorMessage(settingsQuery.error, 'An error occurred while loading settings')}
        </Text>
      </Stack>
    );
  }

  if (!settingsQuery.data) {
    return null;
  }

  const defaultStatus = settingsQuery.data.settings.cycleCount.defaultStatus;

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
            title={'New cycle count'}
            type={'primary'}
            onPress={() =>
              router.push('CycleCount', {
                initial: defaultCreateCycleCount(
                  createGid('Location', session.currentSession.locationId.toString()),
                  defaultStatus,
                ),
              })
            }
          />
        </ResponsiveStack>
      </ResponsiveStack>

      {selectedCycleCountName && selectedCycleCountQuery.isError && (
        <Banner
          title={`Could not load ${selectedCycleCountName}: ${extractErrorMessage(selectedCycleCountQuery.error, 'unknown error')}`}
          variant={'error'}
          visible
          action={'Retry'}
          onPress={() => selectedCycleCountQuery.refetch()}
        />
      )}

      <ResponsiveStack direction={'horizontal'} alignment={'center'} flex={1} paddingHorizontal={'HalfPoint'}>
        <Text variant="body" color="TextSubdued">
          {cycleCountPageQuery.isRefetching ? 'Loading...' : ' '}
        </Text>
      </ResponsiveStack>

      <ResponsiveGrid columns={2} spacing={2}>
        <Button
          title={'Filters' + (activeFilterCount > 0 ? ` (${activeFilterCount})` : '')}
          onPress={() =>
            router.push('Filters', {
              status,
              locationId,
              employeeId,
              sortMode,
              sortOrder,

              defaultSortMode: DEFAULT_SORT_MODE,
              defaultSortOrder: DEFAULT_SORT_ORDER,

              onStatusChange: setStatus,
              onLocationIdChange: setLocationId,
              onEmployeeIdChange: setEmployeeId,
              onSortModeChange: setSortMode,
              onSortOrderChange: setSortOrder,
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
          ...[cycleCount.dueDate].filter(isNonNullable).map<BadgeProps>(dueDate => {
            const date = new Date(dueDate);

            return {
              text: `Due ${date.toLocaleDateString()}`,
              variant:
                new Date().getTime() > date.getTime() && cycleCount.applicationStatus !== 'applied'
                  ? 'critical'
                  : cycleCount.applicationStatus === 'applied'
                    ? 'success'
                    : 'warning',
            };
          }),
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

  if (applicationStatus === 'not-applied') {
    return { text: 'Not applied', variant: 'highlight', status: 'empty' };
  }

  if (applicationStatus === 'partially-applied' || (applicationStatus === 'applied' && changed)) {
    let text = 'Partially applied';

    if (quantities) {
      text += ` (${quantities.appliedQuantity})`;
    }

    return { text, variant: 'highlight', status: 'partial' };
  }

  if (applicationStatus === 'applied') {
    return { text: 'Applied', variant: 'success', status: 'complete' };
  }

  return applicationStatus satisfies never;
}
