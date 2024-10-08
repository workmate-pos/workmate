import { createGid, ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { useDebouncedState } from '@work-orders/common-pos/hooks/use-debounced-state.js';
import { useEffect, useState } from 'react';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { useSpecialOrdersQuery } from '@work-orders/common/queries/use-special-orders-query.js';
import { useSpecialOrderQuery } from '@work-orders/common/queries/use-special-order-query.js';
import { useScreen } from '@teifi-digital/pos-tools/router';
import { useRouter } from '../routes.js';
import { ResponsiveStack } from '@teifi-digital/pos-tools/components/ResponsiveStack.js';
import { Banner, Button, List, ListRow, ScrollView, Text, useApi } from '@shopify/ui-extensions-react/point-of-sale';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { ControlledSearchBar } from '@teifi-digital/pos-tools/components/ControlledSearchBar.js';
import { ResponsiveGrid } from '@teifi-digital/pos-tools/components/ResponsiveGrid.js';
import { DetailedSpecialOrder } from '@web/services/special-orders/types.js';
import { OrderState, PurchaseOrderState } from '@web/schemas/generated/special-order-pagination-options.js';
import {
  getDetailedSpecialOrderBadges,
  getDetailedSpecialOrderSubtitle,
} from '@work-orders/common-pos/util/special-orders.js';
import { getCreateSpecialOrderFromDetailedSpecialOrder } from '@work-orders/common/create-special-order/get-create-special-order-from-detailed-special-order.js';
import { defaultCreateSpecialOrder } from '@work-orders/common/create-special-order/default.js';

export function Entry() {
  const [query, setQuery] = useDebouncedState('');
  const [locationId, setLocationId] = useState<ID>();
  const [customerId, setCustomerId] = useState<ID>();
  const [vendorName, setVendorName] = useState<string>();
  const [orderState, setOrderState] = useState<OrderState>();
  const [purchaseOrderState, setPurchaseOrderState] = useState<PurchaseOrderState>();

  const activeFilterCount = [locationId, customerId, vendorName, orderState, purchaseOrderState].filter(Boolean).length;

  const fetch = useAuthenticatedFetch();

  const specialOrdersQuery = useSpecialOrdersQuery({
    fetch,
    params: {
      query,
      limit: 25,
      customerId,
      locationId,
      lineItemVendorName: vendorName,
      orderState,
      purchaseOrderState,
    },
  });

  const [selectedSpecialOrderName, setSelectedSpecialOrderName] = useState<string>();
  const selectedSpecialOrderQuery = useSpecialOrderQuery(
    { fetch, name: selectedSpecialOrderName ?? null },
    { staleTime: 0 },
  );

  useEffect(() => {
    if (selectedSpecialOrderName && selectedSpecialOrderQuery.data) {
      const initial = getCreateSpecialOrderFromDetailedSpecialOrder(selectedSpecialOrderQuery.data);
      router.push('SpecialOrder', { initial });
      setSelectedSpecialOrderName(undefined);
    }
  }, [selectedSpecialOrderName, selectedSpecialOrderQuery.data]);

  const screen = useScreen();
  screen.setIsLoading(specialOrdersQuery.isLoading || selectedSpecialOrderQuery.isFetching);

  const router = useRouter();

  const { session } = useApi<'pos.home.modal.render'>();
  const rows = useListRows(specialOrdersQuery.data?.pages.flat() ?? [], setSelectedSpecialOrderName);

  return (
    <ScrollView>
      <ResponsiveStack direction={'vertical'} spacing={2}>
        <ResponsiveStack
          direction={'horizontal'}
          alignment={'space-between'}
          sm={{ direction: 'vertical', alignment: 'center' }}
        >
          {selectedSpecialOrderName && selectedSpecialOrderQuery.isError && (
            <Banner
              title={`Could not load ${selectedSpecialOrderName}: ${extractErrorMessage(selectedSpecialOrderQuery.error, 'unknown error')}`}
              variant={'error'}
              visible
              action={'Retry'}
              onPress={() => selectedSpecialOrderQuery.refetch()}
            />
          )}

          <ResponsiveStack direction={'horizontal'} sm={{ alignment: 'center', paddingVertical: 'Small' }}>
            <Text variant="headingLarge">Special Orders</Text>
          </ResponsiveStack>

          {false && (
            <ResponsiveStack direction={'horizontal'} sm={{ direction: 'vertical' }}>
              <Button
                title={'New special order'}
                type={'primary'}
                onPress={() =>
                  router.push('SpecialOrder', {
                    initial: {
                      ...defaultCreateSpecialOrder,
                      locationId: createGid('Location', session.currentSession.locationId),
                    },
                  })
                }
              />
            </ResponsiveStack>
          )}
        </ResponsiveStack>

        <ResponsiveStack direction={'horizontal'} alignment={'center'} flex={1} paddingHorizontal={'HalfPoint'}>
          <Text variant="body" color="TextSubdued">
            {specialOrdersQuery.isRefetching ? 'Loading...' : ' '}
          </Text>
        </ResponsiveStack>

        <ResponsiveGrid columns={2} spacing={2}>
          <Button
            title={'Filters' + (activeFilterCount > 0 ? ` (${activeFilterCount})` : '')}
            onPress={() =>
              router.push('SpecialOrderFilters', {
                locationId,
                customerId,
                orderState,
                purchaseOrderState,
                vendorName,
                onLocationId: setLocationId,
                onCustomerId: setCustomerId,
                onOrderState: setOrderState,
                onPurchaseOrderState: setPurchaseOrderState,
                onVendorName: setVendorName,
              })
            }
          />

          {activeFilterCount > 0 && (
            <Button
              title={'Clear'}
              onPress={() => {
                setLocationId(undefined);
                setCustomerId(undefined);
                setVendorName(undefined);
                setOrderState(undefined);
                setPurchaseOrderState(undefined);
              }}
              type={'destructive'}
            />
          )}
        </ResponsiveGrid>

        <ControlledSearchBar
          value={query}
          onTextChange={query => setQuery(query, !query)}
          onSearch={() => {}}
          placeholder={'Search special orders'}
        />

        <List
          imageDisplayStrategy={'never'}
          data={rows}
          onEndReached={specialOrdersQuery.fetchNextPage}
          isLoadingMore={specialOrdersQuery.isFetchingNextPage}
        />

        {specialOrdersQuery.isLoading && (
          <ResponsiveStack direction="horizontal" alignment="center" flex={1} paddingVertical="ExtraLarge">
            <Text variant="body" color="TextSubdued">
              Loading special orders...
            </Text>
          </ResponsiveStack>
        )}

        {specialOrdersQuery.isSuccess && specialOrdersQuery.data?.pages.length === 0 && (
          <ResponsiveStack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
            <Text variant="body" color="TextSubdued">
              No special orders found
            </Text>
          </ResponsiveStack>
        )}

        {specialOrdersQuery.isError && (
          <ResponsiveStack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
            <Text color="TextCritical" variant="body">
              {extractErrorMessage(specialOrdersQuery.error, 'An error occurred while loading special orders')}
            </Text>
          </ResponsiveStack>
        )}
      </ResponsiveStack>
    </ScrollView>
  );
}

function useListRows(specialOrders: DetailedSpecialOrder[], setSelectedSpecialOrderName: (name: string) => void) {
  return specialOrders.map<ListRow>(specialOrder => {
    return {
      id: specialOrder.name,
      onPress: () => setSelectedSpecialOrderName(specialOrder.name),
      leftSide: {
        label: specialOrder.name,
        badges: getDetailedSpecialOrderBadges(specialOrder),
        subtitle: getDetailedSpecialOrderSubtitle(specialOrder),
      },
      rightSide: {
        showChevron: true,
      },
    };
  });
}
