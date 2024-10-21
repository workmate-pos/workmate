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
  useApi,
} from '@shopify/ui-extensions-react/point-of-sale';
import { ResponsiveStack } from '@teifi-digital/pos-tools/components/ResponsiveStack.js';
import { useScreen } from '@teifi-digital/pos-tools/router';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
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
import { useReserveLineItemsInventoryMutation } from '@work-orders/common/queries/use-reserve-line-items-inventory-mutation.js';
import { UUID } from '@work-orders/common/util/uuid.js';
import { useSpecialOrderMutation } from '@work-orders/common/queries/use-special-order-mutation.js';
import { getProductServiceType } from '@work-orders/common/metafields/product-service-type.js';

/**
 * Fulfillment options for some work order.
 * Allows you to create purchase orders, transfer orders, and shopify orders for some work order line items.
 *
 * Purchase orders are used to backorder inventory.
 * Transfer orders are used to transfer inventory from one location to the other.
 * Reservations can be made to reserve available stock for this work order.
 */
export function WorkOrderItemSourcing({ name }: { name: string }) {
  const { toast, session } = useApi<'pos.home.modal.render'>();
  const fetch = useAuthenticatedFetch();

  const { workOrderQuery, productVariantQueries, inventoryItemQueries } = useWorkOrderQueries(name);
  const workOrder = workOrderQuery.data?.workOrder;

  const rows = useItemListRows(name);

  const router = useRouter();
  const screen = useScreen();
  screen.setTitle(`${name} Sourcing`);
  screen.setIsLoading(workOrderQuery.isFetching);

  const reserveLineItemInventoryMutation = useReserveLineItemsInventoryMutation({ fetch });
  const specialOrderMutation = useSpecialOrderMutation({ fetch });

  const isSubmitting = reserveLineItemInventoryMutation.isPending || specialOrderMutation.isPending;

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
              <Text variant={'body'} color={'TextInteractive'}>
                Help
              </Text>
            </Selectable>
          </ResponsiveStack>
          <Text variant={'body'} color={'TextSubdued'}>
            Control line item inventory sourcing by creating special orders, transfer orders, and by committing
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
            title={'Reserve'}
            isDisabled={isSubmitting}
            isLoading={reserveLineItemInventoryMutation.isPending}
            onPress={() => {
              router.push('UnsourcedItemList', {
                title: 'Select items to reserve',
                items: getUnsourcedWorkOrderItems(workOrder, { includeAvailable: false })
                  // if already in an order we cannot even reserve it smh
                  .filter(item => !isOrderId(item.shopifyOrderLineItem?.orderId))
                  .map(({ uuid, shopifyOrderLineItem, unsourcedQuantity, productVariantId }) => {
                    const productVariantQuery = productVariantQueries[productVariantId];
                    const inventoryItemId = productVariantQuery?.data?.inventoryItem.id;
                    const inventoryItemQuery = inventoryItemId ? inventoryItemQueries[inventoryItemId] : null;
                    const maxQuantity =
                      inventoryItemQuery?.data?.inventoryLevel?.quantities.find(hasPropertyValue('name', 'available'))
                        ?.quantity ?? Infinity;

                    return {
                      uuid,
                      shopifyOrderLineItem,
                      unsourcedQuantity,
                      productVariantId,
                      quantity: unsourcedQuantity,
                      maxQuantity,
                    };
                  }),
                primaryAction: {
                  title: 'Reserve',
                  loading: reserveLineItemInventoryMutation.isPending,
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
            title={'Create transfer order'}
            isDisabled={isSubmitting}
            onPress={() => {
              if (!workOrder.locationId) {
                toast.show('Work order location must be set to create transfer orders');
                return;
              }

              router.push('CreateTransferOrderForLocation', {
                products: getUnsourcedWorkOrderItems(workOrder, { includeAvailable: true }),
                toLocationId: workOrder.locationId,
              });
            }}
          />
          <Button
            title={'Create special order'}
            isDisabled={isSubmitting}
            onPress={() =>
              router.push('CreateSpecialOrderList', {
                workOrder,
                items: getUnsourcedWorkOrderItems(workOrder, { includeAvailable: true }).map(
                  ({ uuid, shopifyOrderLineItem, unsourcedQuantity, productVariantId }) => ({
                    uuid,
                    shopifyOrderLineItem,
                    unsourcedQuantity,
                    productVariantId,
                    quantity: unsourcedQuantity,
                    maxQuantity: Infinity,
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

  return workOrder.items.flatMap<ListRow>(item => {
    if (item.type !== 'product') {
      return [];
    }

    const productVariantQuery = productVariantQueries[item.productVariantId];
    const productVariant = productVariantQuery?.data;

    const serviceType = getProductServiceType(productVariant?.product.serviceType?.value);

    if (serviceType !== null) {
      return [];
    }

    const availableInventoryCount = (() => {
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
    })();

    const subtitle =
      typeof availableInventoryCount === 'number'
        ? ([`${availableInventoryCount} available at current location`] as const)
        : undefined;

    return [
      {
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
          label: productVariant
            ? (getProductVariantName(productVariant) ?? '')
            : productVariantQuery?.isLoading
              ? 'Loading...'
              : productVariantQuery?.isError
                ? 'Error loading product'
                : 'Unknown product',
          badges: getWorkOrderItemSourcingBadges(workOrder, item, {
            includeOrderBadge: true,
            includeStatusBadge: true,
          }),
          subtitle,
        },
        rightSide: { showChevron: true },
      },
    ];
  });
}

function useWorkOrderQueries(name: string) {
  const { session } = useApi<'pos.home.modal.render'>();
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
    locationId: workOrderQuery.data?.workOrder?.locationId ?? createGid('Location', session.currentSession.locationId),
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
  shopifyOrderLineItem: { id: ID; orderId: ID };
};

export function getUnsourcedWorkOrderItems(
  workOrder: DetailedWorkOrder,
  { includeAvailable }: { includeAvailable: boolean },
): UnsourcedWorkOrderItem[] {
  return (
    workOrder.items
      .filter(hasPropertyValue('type', 'product'))
      // very important that this is set bcs the TO/PO line item will not be linked to the WO item in any way
      .filter(hasNonNullableProperty('shopifyOrderLineItem'))
      .map(
        ({
          uuid,
          quantity,
          productVariantId,
          specialOrders,
          transferOrders,
          reservations,
          shopifyOrderLineItem,
          availableInventoryQuantity,
        }) => {
          const sourced = getWorkOrderItemSourcedCount(
            {
              specialOrders,
              transferOrders,
              reservations,
              availableInventoryQuantity,
              quantity,
            },
            { includeAvailable },
          );
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
