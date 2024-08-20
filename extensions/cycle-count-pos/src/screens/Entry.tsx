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
import { sum } from '@teifi-digital/shopify-app-toolbox/array';
import { CycleCountApplicationStatus } from '@web/services/cycle-count/types.js';
import { getCreateCycleCountFromDetailedCycleCount } from '../create-cycle-count/get-create-cycle-count-from-detailed-cycle-count.js';
import { getDefaultCreateCycleCount } from '../create-cycle-count/default.js';
import { createGid } from '@teifi-digital/shopify-app-toolbox/shopify';

export function Entry() {
  const [query, setQuery] = useDebouncedState('');
  const fetch = useAuthenticatedFetch();

  const cycleCountPageQuery = useCycleCountPageQuery({
    fetch,
    filters: {
      query,
    },
  });

  const router = useRouter();

  const [selectedCycleCountName, setSelectedCycleCountName] = useState<string>();
  const selectedCycleCountQuery = useCycleCountQuery({ fetch, name: selectedCycleCountName ?? null }, { staleTime: 0 });

  const screen = useScreen();
  screen.setIsLoading(selectedCycleCountQuery.isLoading);

  const { session } = useExtensionApi<'pos.home.modal.render'>();

  useEffect(() => {
    if (selectedCycleCountQuery.data) {
      const initial = getCreateCycleCountFromDetailedCycleCount(selectedCycleCountQuery.data);
      router.push('CycleCount', { initial });
      setSelectedCycleCountName(undefined);
    }
  }, [selectedCycleCountQuery.data]);

  return (
    <>
      <ResponsiveStack
        direction={'horizontal'}
        alignment={'space-between'}
        paddingVertical={'Small'}
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

      <ControlledSearchBar
        value={query}
        onTextChange={query => setQuery(query, !query)}
        onSearch={() => {}}
        placeholder={'Search cycle counts'}
      />
      <List
        imageDisplayStrategy={'always'}
        data={
          cycleCountPageQuery.data?.pages.flat().map<ListRow>(cycleCount => {
            return {
              id: cycleCount.name,
              onPress: () => setSelectedCycleCountName(cycleCount.name),
              leftSide: {
                label: cycleCount.name,
                image: {
                  badge: sum(cycleCount.items.map(item => item.countQuantity)),
                },
                badges: [getCycleCountApplicationStatusBadge(cycleCount.applicationStatus)],
              },
              rightSide: {
                showChevron: true,
              },
            };
          }) ?? []
        }
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
    </>
  );
}

export function getCycleCountApplicationStatusBadge(applicationStatus: CycleCountApplicationStatus): BadgeProps {
  if (applicationStatus === 'NOT_APPLIED') {
    return { text: 'Not Applied', variant: 'highlight', status: 'empty' };
  }

  if (applicationStatus === 'PARTIALLY_APPLIED') {
    return { text: 'Partially Applied', variant: 'highlight', status: 'partial' };
  }

  return { text: 'Applied', variant: 'success', status: 'complete' };
}
