import {
  BadgeStatus,
  BadgeVariant,
  Button,
  List,
  ListRow,
  ScrollView,
  Stack,
  Text,
} from '@shopify/retail-ui-extensions-react';
import { PopupNavigateFn, useScreen } from '@work-orders/common-pos/hooks/use-screen.js';
import { ResponsiveGrid } from '@work-orders/common-pos/components/ResponsiveGrid.js';
import { useAuthenticatedFetch } from '@work-orders/common-pos/hooks/use-authenticated-fetch.js';
import { ReactNode, useState } from 'react';
import { usePurchaseOrderInfoPageQuery } from '@work-orders/common/queries/use-purchase-order-info-page-query.js';
import { PurchaseOrderInfo } from '@web/services/purchase-orders/types.js';
import { ControlledSearchBar } from '@work-orders/common-pos/components/ControlledSearchBar.js';
import { extractErrorMessage } from '@work-orders/common-pos/util/errors.js';
import { isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { Status } from '@web/schemas/generated/create-purchase-order.js';
import { titleCase } from '@teifi-digital/shopify-app-toolbox/string';
import { useScreenSize } from '@work-orders/common-pos/providers/ScreenSizeProvider.js';

export function Entry() {
  const [query, setQuery] = useState('');

  const { Screen, navigate } = useScreen('Entry', () => {
    setQuery('');
  });

  const fetch = useAuthenticatedFetch();
  const purchaseOrderInfoQuery = usePurchaseOrderInfoPageQuery({ fetch, query });
  const purchaseOrders = purchaseOrderInfoQuery.data?.pages ?? [];

  const purchaseOrderRows = getPurchaseOrderRows(purchaseOrders, arg => navigate('PurchaseOrder', arg));

  const screenSize = useScreenSize();

  const headingOptions: Record<typeof screenSize, ReactNode> = {
    tablet: (
      <ResponsiveGrid columns={2}>
        <Text variant="headingLarge">Purchase Orders</Text>
        <Stack direction={'horizontal'} alignment={'flex-end'}>
          <Button title={'New Purchase Order'} type={'primary'} onPress={() => navigate('PurchaseOrder', null)} />
        </Stack>
      </ResponsiveGrid>
    ),
    mobile: (
      <ResponsiveGrid columns={1}>
        <Stack direction={'horizontal'} alignment={'center'} paddingVertical={'Small'}>
          <Text variant="headingLarge">Purchase Orders</Text>
        </Stack>
        <Stack direction={'horizontal'} flexChildren paddingVertical={'HalfPoint'}>
          <Button title={'New Purchase Order'} type={'primary'} onPress={() => navigate('PurchaseOrder', null)} />
        </Stack>
      </ResponsiveGrid>
    ),
  };

  return (
    <Screen title={'Purchase Orders'}>
      <ScrollView>
        {headingOptions[screenSize]}

        <Stack direction="horizontal" alignment="center" flex={1} paddingHorizontal={'HalfPoint'}>
          <Text variant="body" color="TextSubdued">
            {purchaseOrderInfoQuery.isRefetching ? 'Reloading...' : ' '}
          </Text>
        </Stack>
        <ControlledSearchBar
          value={query}
          onTextChange={setQuery}
          onSearch={() => {}}
          placeholder={'Search purchase orders'}
        />
        <List
          data={purchaseOrderRows}
          onEndReached={purchaseOrderInfoQuery.fetchNextPage}
          isLoadingMore={purchaseOrderInfoQuery.isFetchingNextPage}
        />
        {purchaseOrderInfoQuery.isLoading && (
          <Stack direction="horizontal" alignment="center" flex={1} paddingVertical="ExtraLarge">
            <Text variant="body" color="TextSubdued">
              Loading purchase orders...
            </Text>
          </Stack>
        )}
        {purchaseOrderInfoQuery.isSuccess && purchaseOrderRows.length === 0 && (
          <Stack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
            <Text variant="body" color="TextSubdued">
              No purchase orders found
            </Text>
          </Stack>
        )}
        {purchaseOrderInfoQuery.isError && (
          <Stack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
            <Text color="TextCritical" variant="body">
              {extractErrorMessage(purchaseOrderInfoQuery.error, 'An error occurred while loading purchase orders')}
            </Text>
          </Stack>
        )}
      </ScrollView>
    </Screen>
  );
}

function getPurchaseOrderRows(
  purchaseOrders: PurchaseOrderInfo[],
  openPurchaseOrder: PopupNavigateFn<'PurchaseOrder'>,
) {
  return purchaseOrders.map<ListRow>(purchaseOrder => ({
    id: purchaseOrder.name,
    onPress: () => openPurchaseOrder(purchaseOrder),
    leftSide: {
      label: purchaseOrder.name,
      subtitle: getPurchaseOrderSubtitle(purchaseOrder),
      badges: [
        {
          text: titleCase(purchaseOrder.status),
          variant: getPurchaseOrderBadgeVariant(purchaseOrder),
        },
      ],
    },
    rightSide: {
      showChevron: true,
    },
  }));
}

function getPurchaseOrderSubtitle(purchaseOrder: PurchaseOrderInfo) {
  const possibilities = [
    purchaseOrder.vendorName,
    purchaseOrder.locationName,
    purchaseOrder.workOrderName,
    purchaseOrder.customerName,
  ].filter(isNonNullable);

  if (possibilities.length === 0) {
    return undefined;
  }

  return possibilities.slice(0, 3) as [string] | [string, string] | [string, string, string];
}

function getPurchaseOrderBadgeVariant(purchaseOrder: PurchaseOrderInfo) {
  const mapping: Record<Status, BadgeVariant> = {
    OPEN: 'success',
    CANCELLED: 'neutral',
    CLOSED: 'neutral',
    RECEIVED: 'neutral',
  };

  return mapping[purchaseOrder.status];
}
