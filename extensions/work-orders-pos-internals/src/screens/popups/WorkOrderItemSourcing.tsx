import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { useWorkOrderQuery } from '@work-orders/common/queries/use-work-order-query.js';
import { DetailedWorkOrder, DetailedWorkOrderItem } from '@web/services/work-orders/types.js';
import {
  BadgeProps,
  Button,
  List,
  ListRow,
  ScrollView,
  Selectable,
  Stack,
  Text,
  useExtensionApi,
} from '@shopify/retail-ui-extensions-react';
import { ResponsiveStack } from '@teifi-digital/pos-tools/components/ResponsiveStack.js';
import { useScreen } from '@teifi-digital/pos-tools/router';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { match } from 'ts-pattern';
import { useProductVariantQueries } from '@work-orders/common/queries/use-product-variant-query.js';
import { groupBy, sum, unique } from '@teifi-digital/shopify-app-toolbox/array';
import { hasNonNullableProperty, hasPropertyValue, isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { getPurchaseOrderBadge, getTransferOrderBadge } from '../../util/badges.js';
import { useRouter } from '../../routes.js';
import { SECOND_IN_MS } from '@work-orders/common/time/constants.js';
import { useInventoryItemQueries } from '@work-orders/common/queries/use-inventory-item-query.js';
import { createGid, ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { ResponsiveGrid } from '@teifi-digital/pos-tools/components/ResponsiveGrid.js';
import { useCreateWorkOrderOrderMutation } from '@work-orders/common/queries/use-create-work-order-order-mutation.js';
import { CreatePurchaseOrder } from '@web/schemas/generated/create-purchase-order.js';
import { defaultCreatePurchaseOrder } from '@work-orders/common/create-purchase-order/default.js';
import { useSettingsQuery } from '@work-orders/common/queries/use-settings-query.js';
import { BigDecimal } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { useCustomFieldsPresetsQuery } from '@work-orders/common/queries/use-custom-fields-presets-query.js';
import { StockTransferLineItem } from '@web/schemas/generated/create-stock-transfer.js';
import { useState } from 'react';
import { useReserveLineItemsInventoryMutation } from '@work-orders/common/queries/use-reserve-line-items-inventory-mutation.js';

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

  const settingsQuery = useSettingsQuery({ fetch });
  const purchaseOrderCustomFieldsPresetsQuery = useCustomFieldsPresetsQuery({ fetch, type: 'PURCHASE_ORDER' });
  const { workOrderQuery, productVariantQueries } = useWorkOrderQueries(name);
  const workOrder = workOrderQuery.data?.workOrder;

  const rows = useItemListRows(name);

  const createWorkOrderOrderMutation = useCreateWorkOrderOrderMutation({ fetch });

  const router = useRouter();
  const screen = useScreen();
  screen.setTitle(`${name} Sourcing`);
  screen.setIsLoading(workOrderQuery.isFetching);

  const isSubmitting = createWorkOrderOrderMutation.isLoading;

  const { onReserveInventoryClick } = useOnReserveInventoryClick(workOrder);

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
          <Button title={'Reserve from Inventory'} isDisabled={isSubmitting} onPress={onReserveInventoryClick} />
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
            title={'Create Purchase Order'}
            isDisabled={isSubmitting}
            onPress={() => {
              const unsourcedUuids = getUnsourcedWorkOrderItems(workOrder).map(item => item.uuid);
              const items = rows.filter(row => unsourcedUuids.includes(row.id));

              router.push('ListPopup', {
                imageDisplayStrategy: 'always',
                title: 'Select items to add to Purchase Order',
                selection: {
                  type: 'multi-select',
                  items,
                },
                actions: [
                  {
                    title: 'Create Purchase Order',
                    onAction: itemUuids => {
                      const status = settingsQuery.data?.settings.defaultPurchaseOrderStatus;
                      const customFields = purchaseOrderCustomFieldsPresetsQuery.data?.defaultCustomFields;

                      if (!status || !customFields) {
                        toast.show('Wait for settings to load before creating a purchase order');
                        return;
                      }

                      // TODO: List of vendors to pick from instead of products?

                      const createPurchaseOrder: CreatePurchaseOrder = {
                        ...defaultCreatePurchaseOrder({ status }),
                        customFields,
                        lineItems: itemUuids
                          .map<CreatePurchaseOrder['lineItems'][number] | null>(uuid => {
                            const workOrderItem = workOrder.items.find(hasPropertyValue('uuid', uuid));

                            if (!workOrderItem) {
                              return null;
                            }

                            if (workOrderItem.type !== 'product') {
                              return null;
                            }

                            const { productVariantId, quantity, shopifyOrderLineItem } = workOrderItem;
                            const productVariantQuery = productVariantQueries[productVariantId];

                            if (!productVariantQuery?.data) {
                              return null;
                            }

                            const {
                              inventoryItem: { unitCost },
                            } = productVariantQuery.data;

                            return {
                              // can just recycle the work order item uuid
                              uuid,
                              shopifyOrderLineItem,
                              quantity,
                              productVariantId,
                              availableQuantity: 0,
                              // TODO: default custom fields - just let PO module do this in the future
                              customFields: {},
                              unitCost: unitCost
                                ? BigDecimal.fromDecimal(unitCost.amount).toMoney()
                                : BigDecimal.ZERO.toMoney(),
                            };
                          })
                          .filter(isNonNullable),
                      };

                      if (createPurchaseOrder.lineItems.length !== itemUuids.length) {
                        toast.show('Some items could not be added to the transfer order');
                        return;
                      }

                      router.push('PurchaseOrder', { initial: createPurchaseOrder });
                    },
                  },
                ],
                emptyState: (
                  <Stack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
                    <Text variant="body" color="TextSubdued">
                      No items in need of sourcing
                    </Text>
                  </Stack>
                ),
              });
            }}
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
        badges: getWorkOrderItemFulfillmentBadges(item),
        subtitle,
      },
      rightSide: { showChevron: true },
    };
  });
}

export function getWorkOrderItemFulfillmentBadges(item: DetailedWorkOrderItem): BadgeProps[] {
  const totalSourced = getWorkOrderItemSourcedCount(item);

  const sourcedAllItemsBadge: BadgeProps | undefined =
    totalSourced >= item.quantity ? { text: 'Sourced all items', status: 'complete', variant: 'success' } : undefined;
  const requiresSourcingBadge: BadgeProps | undefined =
    totalSourced < item.quantity
      ? { text: 'Requires sourcing', status: totalSourced > 0 ? 'partial' : 'empty', variant: 'critical' }
      : undefined;

  const purchaseOrderBadges = item.purchaseOrders.map<BadgeProps>(po => getPurchaseOrderBadge(po, true));
  const transferOrderBadges = item.transferOrders.map<BadgeProps>(to => getTransferOrderBadge(to, true));

  // This inventory will always come from the current location, so no need to show the location
  // TODO: Think about whether we should actually show location/how to handle logging into pos on different locations
  const reservedCount = sum(item.reservations.map(reservation => reservation.quantity));
  const inventoryBadge: BadgeProps | undefined =
    reservedCount > 0 ? { text: `${reservedCount} • Inventory`, variant: 'success' } : undefined;

  return [
    sourcedAllItemsBadge,
    requiresSourcingBadge,
    ...purchaseOrderBadges,
    ...transferOrderBadges,
    inventoryBadge,
  ].filter(isNonNullable);
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
  uuid: string;
  productVariantId: ID;
  unsourcedQuantity: number;
  shopifyOrderLineItem: NonNullable<StockTransferLineItem['shopifyOrderLineItem']>;
};

function getUnsourcedWorkOrderItems(workOrder: DetailedWorkOrder): UnsourcedWorkOrderItem[] {
  return (
    workOrder.items
      .filter(hasPropertyValue('type', 'product'))
      // very important that this is set bcs the TO/PO line item will not be linked to the WO item in any way
      .filter(hasNonNullableProperty('shopifyOrderLineItem'))
      .map(
        ({ uuid, quantity, productVariantId, purchaseOrders, transferOrders, reservations, shopifyOrderLineItem }) => {
          const sourced = getWorkOrderItemSourcedCount({ purchaseOrders, transferOrders, reservations });
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

function getWorkOrderItemSourcedCount(
  item: Pick<DetailedWorkOrderItem, 'purchaseOrders' | 'transferOrders' | 'reservations'>,
) {
  return sum([
    ...item.purchaseOrders.flatMap(po => po.items).map(item => item.quantity),
    ...item.transferOrders.flatMap(to => to.items).map(item => item.quantity),
    ...item.reservations.map(reservation => reservation.quantity),
  ]);
}

function useOnReserveInventoryClick(workOrder: DetailedWorkOrder | null | undefined) {
  const router = useRouter();
  const fetch = useAuthenticatedFetch();
  const { session, toast } = useExtensionApi<'pos.home.modal.render'>();
  const screen = useScreen();
  const locationId = createGid('Location', session.currentSession.locationId);

  const reserveLineItemInventoryMutation = useReserveLineItemsInventoryMutation({ fetch });
  screen.setIsLoading(reserveLineItemInventoryMutation.isLoading);

  // TODO: store items here along with the quantities

  const initialSelectedItems = workOrder
    ? getUnsourcedWorkOrderItems(workOrder).map(
        ({ uuid, shopifyOrderLineItem, unsourcedQuantity, productVariantId }) => ({
          uuid,
          shopifyOrderLineItem,
          unsourcedQuantity,
          productVariantId,
          quantity: unsourcedQuantity,
        }),
      )
    : [];

  // TODO: Fix this - changing this state here does not cause the quantity pop up to work correctly. We should open it here instead of through that action somehow
  const [selectedItems, setSelectedItems] = useState(initialSelectedItems);

  const getListPopupItem = (item: (typeof selectedItems)[number]) => ({
    id: item.uuid,
    leftSide: {
      label: getProductVariantName(productVariantQueries[item.productVariantId]?.data) ?? 'Unknown product',
      subtitle: [`${item.unsourcedQuantity} unsourced`] as const,
      image: {
        source:
          productVariantQueries[item.productVariantId]?.data?.image?.url ??
          productVariantQueries[item.productVariantId]?.data?.product?.featuredImage?.url,
        badge: item.quantity,
      },
    },
  });

  const productVariantIds = unique(selectedItems.map(item => item.productVariantId));
  const productVariantQueries = useProductVariantQueries({ fetch, ids: productVariantIds });

  const onReserveInventoryClick = () =>
    router.push('ListPopup', {
      imageDisplayStrategy: 'always',
      title: 'Select items to reserve',
      selection: {
        type: 'multi-select',
        items: selectedItems.map(item => getListPopupItem(item)),
        initialSelection: initialSelectedItems.map(item => getListPopupItem(item).id),
        // On close reset any changed quantities
        onClose: () => setSelectedItems(initialSelectedItems),
      },
      actions: [
        {
          title: 'Change quantities',
          type: 'plain',
          onAction: () =>
            router.push('QuantityAdjustmentList', {
              items: selectedItems.map(item => ({
                id: item.uuid,
                quantity: item.quantity,
                min: 1,
                max: item.unsourcedQuantity,
                name: getProductVariantName(productVariantQueries[item.productVariantId]?.data) ?? 'Unknown product',
              })),
              onChange: items => {
                setSelectedItems(current =>
                  current.map(item => ({
                    ...item,
                    quantity: items.find(hasPropertyValue('id', item.uuid))?.quantity ?? item.quantity,
                  })),
                );
              },
            }),
        },
        {
          title: 'Reserve',
          type: 'primary',
          onAction: itemIds => {
            router.pop();
            reserveLineItemInventoryMutation.mutate(
              {
                reservations: selectedItems.map(item => ({
                  locationId,
                  quantity: item.quantity,
                  lineItemId: item.shopifyOrderLineItem.id,
                })),
              },
              {
                onSuccess() {
                  toast.show('Reserved items!');
                },
              },
            );
          },
        },
      ],
    });

  return {
    onReserveInventoryClick: () => {
      if (Object.values(productVariantQueries).some(query => query.isLoading)) {
        toast.show('Please wait for product details to load');
        return;
      }

      onReserveInventoryClick();
    },
  };
}
