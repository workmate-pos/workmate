import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { useWorkOrderQuery } from '@work-orders/common/queries/use-work-order-query.js';
import { DetailedWorkOrder } from '@web/services/work-orders/types.js';
import {
  Button,
  List,
  ListRow,
  ScrollView,
  Selectable,
  Text,
  useExtensionApi,
} from '@shopify/retail-ui-extensions-react';
import { ResponsiveStack } from '@teifi-digital/pos-tools/components/ResponsiveStack.js';
import { useScreen } from '@teifi-digital/pos-tools/router';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { match } from 'ts-pattern';
import { useProductVariantQueries } from '@work-orders/common/queries/use-product-variant-query.js';
import { unique } from '@teifi-digital/shopify-app-toolbox/array';
import { hasNonNullableProperty, hasPropertyValue } from '@teifi-digital/shopify-app-toolbox/guards';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { getWorkOrderItemSourcedCount, getWorkOrderItemSourcingBadges, isOrderId } from '../../util/badges.js';
import { useRouter } from '../../routes.js';
import { SECOND_IN_MS } from '@work-orders/common/time/constants.js';
import { useInventoryItemQueries } from '@work-orders/common/queries/use-inventory-item-query.js';
import { createGid, ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { ResponsiveGrid } from '@teifi-digital/pos-tools/components/ResponsiveGrid.js';
import { StockTransferLineItem } from '@web/schemas/generated/create-stock-transfer.js';
import { useReserveLineItemsInventoryMutation } from '@work-orders/common/queries/use-reserve-line-items-inventory-mutation.js';
import { UUID } from '@work-orders/common/util/uuid.js';

/**
 * Fulfillment options for some work order.
 * Allows you to create purchase orders, transfer orders, and shopify orders for some work order line items.
 *
 * Purchase orders are used to backorder inventory.
 * Transfer orders are used to transfer inventory from one location to the other.
 * Reservations can be made to reserve available stock for this work order.
 */
export function WorkOrderItemSourcing({ name }: { name: string }) {
  const { toast, session } = useExtensionApi<'pos.home.modal.render'>();
  const fetch = useAuthenticatedFetch();

  const { workOrderQuery, productVariantQueries, inventoryItemQueries } = useWorkOrderQueries(name);
  const workOrder = workOrderQuery.data?.workOrder;

  const rows = useItemListRows(name);

  const router = useRouter();
  const screen = useScreen();
  screen.setTitle(`${name} Sourcing`);
  screen.setIsLoading(workOrderQuery.isFetching);

  const reserveLineItemInventoryMutation = useReserveLineItemsInventoryMutation({ fetch });

  const isSubmitting = reserveLineItemInventoryMutation.isLoading;

  if (workOrderQuery.isError) {
    return (
      <ScrollView>
        <ResponsiveStack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
          <Text color="TextCritical" variant="body">
            {extractErrorMessage(workOrderQuery.error, 'An error occurred while loading work order')}
          </Text>
        </ResponsiveStack>
      </ScrollView>
    );
  }

  if (!workOrder) {
    return null;
  }

  return (
    <ScrollView>
      <ResponsiveStack direction={'vertical'} spacing={1}>
        <ResponsiveStack direction={'vertical'} paddingVertical={'Medium'} spacing={1}>
          <ResponsiveStack direction={'horizontal'} spacing={2} alignment={'space-between'} flexWrap={'wrap'}>
            <Text variant={'headingLarge'}>Work Order Sourcing</Text>
            <Selectable onPress={() => router.push('WorkOrderItemSourcingHelp', {})}>
              <Text variant={'bodyMd'} color={'TextInteractive'}>
                Help
              </Text>
            </Selectable>
          </ResponsiveStack>
          <Text variant={'bodyMd'} color={'TextSubdued'}>
            Control line item inventory sourcing by creating purchase orders, transfer orders, and by committing
            inventory to this work order.
          </Text>
        </ResponsiveStack>

        <List imageDisplayStrategy={'always'} data={rows} onEndReached={() => {}} isLoadingMore={false} />
        {rows.length === 0 && (
          <ResponsiveStack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
            <Text variant="body" color="TextSubdued">
              No items found
            </Text>
          </ResponsiveStack>
        )}

        <ResponsiveGrid columns={3}>
          <Button
            title={'Layaway'}
            isDisabled={isSubmitting}
            isLoading={reserveLineItemInventoryMutation.isLoading}
            onPress={() => {
              router.push('UnsourcedItemList', {
                title: 'Select items to layaway',
                items: getUnsourcedWorkOrderItems(workOrder)
                  // if already in an order we cannot even reserve it smh
                  .filter(item => !isOrderId(item.shopifyOrderLineItem?.orderId))
                  .map(({ uuid, shopifyOrderLineItem, unsourcedQuantity, productVariantId }) => {
                    const productVariantQuery = productVariantQueries[productVariantId];
                    const inventoryItemId = productVariantQuery?.data?.inventoryItem.id;
                    const inventoryItemQuery = inventoryItemId ? inventoryItemQueries[inventoryItemId] : null;
                    const availableQuantity =
                      inventoryItemQuery?.data?.inventoryLevel?.quantities.find(hasPropertyValue('name', 'available'))
                        ?.quantity ?? Infinity;

                    return {
                      uuid,
                      shopifyOrderLineItem,
                      unsourcedQuantity,
                      productVariantId,
                      quantity: unsourcedQuantity,
                      availableQuantity,
                    };
                  }),
                primaryAction: {
                  title: 'Reserve',
                  loading: reserveLineItemInventoryMutation.isLoading,
                  onAction: selectedItems => {
                    reserveLineItemInventoryMutation.mutate(
                      {
                        reservations: selectedItems.map(item => ({
                          locationId: createGid('Location', session.currentSession.locationId),
                          quantity: item.quantity,
                          lineItemId: item.shopifyOrderLineItem.id,
                        })),
                      },
                      {
                        onSuccess() {
                          toast.show('Reserved items!');
                          router.pop();
                        },
                      },
                    );
                  },
                },
              });
            }}
          />
          <Button
            title={'Create Transfer Order'}
            isDisabled={isSubmitting}
            onPress={() =>
              router.push('CreateTransferOrderForLocation', {
                products: getUnsourcedWorkOrderItems(workOrder),
                toLocationId: createGid('Location', session.currentSession.locationId),
              })
            }
          />
          <Button
            title={'Create Special Order'}
            isDisabled={isSubmitting}
            onPress={() =>
              router.push('CreateSpecialOrderList', {
                workOrder,
                items: getUnsourcedWorkOrderItems(workOrder).map(
                  ({ uuid, shopifyOrderLineItem, unsourcedQuantity, productVariantId }) => ({
                    uuid,
                    shopifyOrderLineItem,
                    unsourcedQuantity,
                    productVariantId,
                    quantity: unsourcedQuantity,
                    availableQuantity: Infinity,
                  }),
                ),
              })
            }
          />
        </ResponsiveGrid>
      </ResponsiveStack>
    </ScrollView>
  );
}

function useItemListRows(name: string): ListRow[] {
  const router = useRouter();

  const { workOrderQuery, productVariantQueries, inventoryItemQueries } = useWorkOrderQueries(name);
  const workOrder = workOrderQuery.data?.workOrder;

  if (!workOrder) {
    return [];
  }

  return workOrder.items.map<ListRow>(item => {
    const productVariantQuery = item.type === 'product' ? productVariantQueries[item.productVariantId] : null;
    const productVariant = productVariantQuery?.data;

    const availableInventoryCount = match(item)
      .with({ type: 'product' }, item => {
        if (!productVariant) {
          return null;
        }

        const inventoryItemId = productVariant.inventoryItem.id;
        const inventoryItemQuery = inventoryItemQueries[inventoryItemId];

        if (!inventoryItemQuery) {
          return null;
        }

        if (!inventoryItemQuery?.data) {
          return null;
        }

        return inventoryItemQuery.data.inventoryLevel?.quantities.find(hasPropertyValue('name', 'available'))?.quantity;
      })
      .with({ type: 'custom-item' }, () => null)
      .exhaustive();

    const subtitle =
      typeof availableInventoryCount === 'number'
        ? ([`${availableInventoryCount} available at current location`] as const)
        : undefined;

    return {
      id: item.uuid,
      onPress: () => {
        // TODO : ability to open PO/TO from this menu
        // TODO : ability to open PO/TO from the entire page too (just a response grid of them below a header)
        router.push('WorkOrderItemSourcingItem', { workOrderName: workOrder.name, uuid: item.uuid });
      },
      leftSide: {
        image: {
          source: productVariant?.image?.url ?? productVariant?.product?.featuredImage?.url,
          badge: item.quantity,
        },
        label: match(item)
          .with({ type: 'product' }, item => {
            const productVariantQuery = productVariantQueries[item.productVariantId];

            if (!productVariantQuery) {
              return 'N/A';
            }

            if (productVariantQuery.isLoading) {
              return 'Loading...';
            }

            if (productVariantQuery.isError) {
              return 'Error loading product';
            }

            const productVariant = productVariantQuery.data;
            return getProductVariantName(productVariant) ?? 'Unknown product';
          })
          .with({ type: 'custom-item' }, item => item.name)
          .exhaustive(),
        badges: getWorkOrderItemSourcingBadges(workOrder, item, { includeOrderBadge: true, includeStatusBadge: true }),
        subtitle,
      },
      rightSide: { showChevron: true },
    };
  });
}

function useWorkOrderQueries(name: string) {
  const { session } = useExtensionApi<'pos.home.modal.render'>();
  const fetch = useAuthenticatedFetch();

  const workOrderQuery = useWorkOrderQuery({ fetch, name }, { staleTime: 10 * SECOND_IN_MS });

  const productVariantIds = unique(
    workOrderQuery.data?.workOrder?.items
      .filter(hasPropertyValue('type', 'product'))
      .map(item => item.productVariantId) ?? [],
  );
  const productVariantQueries = useProductVariantQueries({ fetch, ids: productVariantIds });

  const inventoryItemIds = unique(
    Object.values(productVariantQueries)
      .filter(hasNonNullableProperty('data'))
      .map(query => query.data.inventoryItem.id),
  );
  const inventoryItemQueries = useInventoryItemQueries({
    fetch,
    ids: inventoryItemIds,
    locationId: createGid('Location', session.currentSession.locationId),
  });

  return {
    workOrderQuery,
    productVariantQueries,
    inventoryItemQueries,
  };
}

export type UnsourcedWorkOrderItem = {
  uuid: UUID;
  productVariantId: ID;
  unsourcedQuantity: number;
  shopifyOrderLineItem: NonNullable<StockTransferLineItem['shopifyOrderLineItem']>;
};

export function getUnsourcedWorkOrderItems(workOrder: DetailedWorkOrder): UnsourcedWorkOrderItem[] {
  return (
    workOrder.items
      .filter(hasPropertyValue('type', 'product'))
      // very important that this is set bcs the TO/PO line item will not be linked to the WO item in any way
      .filter(hasNonNullableProperty('shopifyOrderLineItem'))
      .map(
        ({ uuid, quantity, productVariantId, specialOrders, transferOrders, reservations, shopifyOrderLineItem }) => {
          const sourced = getWorkOrderItemSourcedCount({ specialOrders, transferOrders, reservations });
          const unsourcedQuantity = Math.max(0, quantity - sourced);

          return {
            uuid,
            productVariantId,
            unsourcedQuantity,
            shopifyOrderLineItem,
          };
        },
      )
      .filter(item => item.unsourcedQuantity > 0)
  );
}
