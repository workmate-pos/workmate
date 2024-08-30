import { createGid, ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { useDebouncedState } from '@work-orders/common-pos/hooks/use-debounced-state.js';
import { useState } from 'react';
import { useLocationQuery } from '@work-orders/common/queries/use-location-query.js';
import { useCustomerQuery } from '@work-orders/common/queries/use-customer-query.js';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { useSpecialOrdersQuery } from '@work-orders/common/queries/use-special-orders-query.js';
import { useSpecialOrderQuery } from '@work-orders/common/queries/use-special-order-query.js';
import { useScreen } from '@teifi-digital/pos-tools/router';
import { useRouter } from '../routes.js';
import { ResponsiveStack } from '@teifi-digital/pos-tools/components/ResponsiveStack.js';
import { BadgeProps, Banner, Button, List, ListRow, Text, useExtensionApi } from '@shopify/retail-ui-extensions-react';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { ControlledSearchBar } from '@teifi-digital/pos-tools/components/ControlledSearchBar.js';
import { ResponsiveGrid } from '@teifi-digital/pos-tools/components/ResponsiveGrid.js';
import { getDefaultCreateSpecialOrder } from '../create-special-order/default.js';
import { getCreateSpecialOrderFromDetailedSpecialOrder } from '../create-special-order/get-create-special-order-from-detailed-special-order.js';
import { DetailedSpecialOrder } from '@web/services/special-orders/types.js';
import { hasPropertyValue } from '@teifi-digital/shopify-app-toolbox/guards';
import { OrderState, PurchaseOrderState } from '@web/schemas/generated/special-order-pagination-options.js';
import { titleCase } from '@teifi-digital/shopify-app-toolbox/string';

export function Entry() {
  const [query, setQuery] = useDebouncedState('');
  const [locationId, setLocationId] = useState<ID>();
  const [customerId, setCustomerId] = useState<ID>();
  const [vendorName, setVendorName] = useState<string>();
  const [orderState, setOrderState] = useState<OrderState>();
  const [purchaseOrderState, setPurchaseOrderState] = useState<PurchaseOrderState>();

  const fetch = useAuthenticatedFetch();

  const locationQuery = useLocationQuery({ fetch, id: locationId ?? null });
  const location = locationQuery.data;

  const customerQuery = useCustomerQuery({ fetch, id: customerId ?? null });
  const customer = customerQuery.data;

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
    {
      staleTime: 0,
      onSuccess(specialOrder) {
        if (specialOrder) {
          const initial = getCreateSpecialOrderFromDetailedSpecialOrder(specialOrder);
          router.push('SpecialOrder', { initial });
          setSelectedSpecialOrderName(undefined);
        }
      },
    },
  );

  const screen = useScreen();
  screen.setIsLoading(specialOrdersQuery.isLoading || selectedSpecialOrderQuery.isFetching);

  const router = useRouter();

  const { session } = useExtensionApi<'pos.home.modal.render'>();
  const rows = useListRows(specialOrdersQuery.data?.pages.flat() ?? [], setSelectedSpecialOrderName);

  return (
    <ResponsiveStack direction={'vertical'} spacing={2}>
      <ResponsiveStack
        direction={'horizontal'}
        alignment={'space-between'}
        sm={{ direction: 'vertical', alignment: 'center' }}
      >
        <ResponsiveStack direction={'horizontal'} sm={{ alignment: 'center', paddingVertical: 'Small' }}>
          <Text variant="headingLarge">Special Orders</Text>
        </ResponsiveStack>

        <ResponsiveStack direction={'horizontal'} sm={{ direction: 'vertical' }}>
          <Button
            title={'New Special Order'}
            type={'primary'}
            onPress={() =>
              router.push('SpecialOrder', {
                initial: getDefaultCreateSpecialOrder(
                  createGid('Location', session.currentSession.locationId.toString()),
                ),
              })
            }
          />
        </ResponsiveStack>
      </ResponsiveStack>

      {selectedSpecialOrderName && selectedSpecialOrderQuery.isError && (
        <Banner
          title={`Could not load ${selectedSpecialOrderName}: ${extractErrorMessage(selectedSpecialOrderQuery.error, 'unknown error')}`}
          variant={'error'}
          visible
          action={'Retry'}
          onAction={() => selectedSpecialOrderQuery.refetch()}
        />
      )}

      <ResponsiveStack direction={'horizontal'} alignment={'center'} flex={1} paddingHorizontal={'HalfPoint'}>
        <Text variant="body" color="TextSubdued">
          {specialOrdersQuery.isRefetching ? 'Loading...' : ' '}
        </Text>
      </ResponsiveStack>

      <ResponsiveGrid columns={1} spacing={2}>
        <ResponsiveStack direction={'horizontal'} alignment={'center'}>
          <Text variant="headingLarge">Filters</Text>
        </ResponsiveStack>

        <ResponsiveGrid columns={2} smColumns={1}>
          <Button
            title={'Location' + (locationId ? `: ${location?.name ?? 'loading...'}` : '')}
            onPress={() =>
              router.push('LocationSelector', {
                onSelect: location => setLocationId(location.id),
                onClear: () => setLocationId(undefined),
              })
            }
          />
          <Button
            title={'Vendor' + (vendorName ? `: ${vendorName}` : '')}
            onPress={() =>
              router.push('VendorSelector', {
                onSelect: setVendorName,
                onClear: () => setVendorName(undefined),
              })
            }
          />
          <Button
            title={'Customer' + (customerId ? `: ${customer?.displayName ?? 'loading...'}` : '')}
            onPress={() =>
              router.push('CustomerSelector', {
                onSelect: customer => setCustomerId(customer.id),
                onClear: () => setCustomerId(undefined),
              })
            }
          />
          <Button
            title={'Order state' + (orderState ? `: ${titleCase(orderState).toLowerCase()}` : '')}
            onPress={() =>
              router.push('OrderStateSelector', {
                onSelect: setOrderState,
                onClear: () => setOrderState(undefined),
              })
            }
          />
          <Button
            title={
              'Purchase order state' + (purchaseOrderState ? `: ${titleCase(purchaseOrderState).toLowerCase()}` : '')
            }
            onPress={() =>
              router.push('PurchaseOrderStateSelector', {
                onSelect: setPurchaseOrderState,
                onClear: () => setPurchaseOrderState(undefined),
              })
            }
          />
        </ResponsiveGrid>

        <Button
          title={'Clear'}
          onPress={() => {
            setQuery('');
            setLocationId(undefined);
            setCustomerId(undefined);
            setVendorName(undefined);
            setOrderState(undefined);
            setPurchaseOrderState(undefined);
          }}
          type={'destructive'}
          isDisabled={![query, locationId, customerId, vendorName, orderState, purchaseOrderState].some(Boolean)}
        />
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
  );
}

function useListRows(specialOrders: DetailedSpecialOrder[], setSelectedSpecialOrderName: (name: string) => void) {
  return specialOrders.map<ListRow>(specialOrder => {
    const workOrderOrderIds = new Set(...specialOrder.workOrders.flatMap(wo => wo.orderIds));

    return {
      id: specialOrder.name,
      onPress: () => setSelectedSpecialOrderName(specialOrder.name),
      leftSide: {
        label: specialOrder.name,
        badges: [
          getSpecialOrderOrderStateBadge(specialOrder),
          getSpecialOrderPurchaseOrderStateBadge(specialOrder),
          ...specialOrder.workOrders.map<BadgeProps>(workOrder => ({
            text: workOrder.name,
            variant: 'highlight',
          })),
          ...specialOrder.orders
            .filter(hasPropertyValue('type', 'ORDER'))
            .filter(order => !workOrderOrderIds.has(order.id))
            .map<BadgeProps>(order => ({
              text: order.name,
              variant: 'highlight',
            })),
          ...specialOrder.purchaseOrders.map<BadgeProps>(po => ({
            text: `${po.name} (${po.vendorName})`,
            variant: po.availableQuantity >= po.quantity ? 'success' : 'warning',
            status: po.availableQuantity >= po.quantity ? 'complete' : po.availableQuantity > 0 ? 'partial' : 'empty',
          })),
        ],
      },
      rightSide: {
        showChevron: true,
      },
    };
  });
}

export function getSpecialOrderOrderStateBadge({ orderState, purchaseOrders }: DetailedSpecialOrder): BadgeProps {
  return {
    text: titleCase(orderState),
    variant: orderState === 'FULLY_ORDERED' ? 'success' : 'warning',
    status: orderState === 'FULLY_ORDERED' ? 'complete' : purchaseOrders.length > 0 ? 'partial' : 'empty',
  };
}

export function getSpecialOrderPurchaseOrderStateBadge({
  purchaseOrderState,
  purchaseOrders,
}: DetailedSpecialOrder): BadgeProps {
  return {
    text: titleCase(purchaseOrderState),
    variant: purchaseOrderState === 'ALL_RECEIVED' ? 'success' : 'warning',
    status:
      purchaseOrderState === 'ALL_RECEIVED'
        ? 'complete'
        : purchaseOrders.some(po => po.availableQuantity > 0)
          ? 'partial'
          : 'empty',
  };
}
