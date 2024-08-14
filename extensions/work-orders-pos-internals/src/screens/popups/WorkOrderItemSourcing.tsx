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
  Text,
  useExtensionApi,
} from '@shopify/retail-ui-extensions-react';
import { ResponsiveStack } from '@teifi-digital/pos-tools/components/ResponsiveStack.js';
import { useScreen } from '@teifi-digital/pos-tools/router';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { match } from 'ts-pattern';
import { useProductVariantQueries } from '@work-orders/common/queries/use-product-variant-query.js';
import { sum, unique } from '@teifi-digital/shopify-app-toolbox/array';
import { hasNonNullableProperty, hasPropertyValue, isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { getPurchaseOrderBadge, getTransferOrderBadge } from '../../util/badges.js';
import { useRouter } from '../../routes.js';
import { SECOND_IN_MS } from '@work-orders/common/time/constants.js';
import { useInventoryItemQueries } from '@work-orders/common/queries/use-inventory-item-query.js';
import { createGid, parseGid } from '@teifi-digital/shopify-app-toolbox/shopify';
import { ResponsiveGrid } from '@teifi-digital/pos-tools/components/ResponsiveGrid.js';
import { useCreateWorkOrderOrderMutation } from '@work-orders/common/queries/use-create-work-order-order-mutation.js';
import { WIPCreateStockTransfer } from '../../create-stock-transfer/reducer.js';
import { CreateStockTransfer } from '@web/schemas/generated/create-stock-transfer.js';
import { CreatePurchaseOrder } from '@web/schemas/generated/create-purchase-order.js';
import { defaultCreatePurchaseOrder } from '@work-orders/common/create-purchase-order/default.js';
import { useSettingsQuery } from '@work-orders/common/queries/use-settings-query.js';
import { BigDecimal } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { useCustomFieldsPresetsQuery } from '@work-orders/common/queries/use-custom-fields-presets-query.js';

/**
 * Fulfillment options for some work order.
 * Allows you to create purchase orders, transfer orders, and shopify orders for some work order line items.
 *
 * Purchase orders are used to backorder inventory.
 * Transfer orders are used to transfer inventory from one location to the other.
 * Shopify orders can be created to commit in-stock inventory.
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

  // TODO: Different name from fulfillment since thats already a shopify thing and is not the same
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

        <List data={rows} onEndReached={() => {}} isLoadingMore={false} />
        {rows.length === 0 && (
          <ResponsiveStack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
            <Text variant="body" color="TextSubdued">
              No items found
            </Text>
          </ResponsiveStack>
        )}

        <ResponsiveGrid columns={3}>
          <Button
            title={'Create Shopify Order'}
            onPress={() =>
              router.push('ListPopup', {
                title: 'Select items to add to Shopify Order',
                selection: {
                  type: 'multi-select',
                  items: rows.map(row => {
                    const orderId = workOrder.items.find(hasPropertyValue('uuid', row.id))?.shopifyOrderLineItem
                      ?.orderId;
                    const hasShopifyOrder = orderId && parseGid(orderId).objectName === 'Order';
                    return {
                      ...row,
                      disabled: hasShopifyOrder,
                    };
                  }),
                  actions: {
                    save: {
                      title: 'Create Shopify Order',
                      onSave: itemUuids =>
                        createWorkOrderOrderMutation.mutate({
                          name: workOrder.name,
                          items: itemUuids.map(uuid => ({ uuid })),
                          charges: [],
                        }),
                    },
                  },
                },
              })
            }
            isDisabled={isSubmitting}
            isLoading={createWorkOrderOrderMutation.isLoading}
          />
          <Button
            title={'Create Purchase Order'}
            isDisabled={isSubmitting}
            onPress={() =>
              router.push('ListPopup', {
                title: 'Select items to add to Purchase Order',
                selection: {
                  type: 'multi-select',
                  items: rows,
                  actions: {
                    save: {
                      title: 'Create Purchase Order',
                      onSave: itemUuids => {
                        const status = settingsQuery.data?.settings.defaultPurchaseOrderStatus;
                        const customFields = purchaseOrderCustomFieldsPresetsQuery.data?.defaultCustomFields;

                        if (!status || !customFields) {
                          toast.show('Wait for settings to load before creating a purchase order');
                          return;
                        }

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
                  },
                },
              })
            }
          />
          <Button
            title={'Create Transfer Order'}
            isDisabled={isSubmitting}
            onPress={() =>
              router.push('ListPopup', {
                title: 'Select items to add to Transfer Order',
                selection: {
                  type: 'multi-select',
                  items: rows,
                  actions: {
                    save: {
                      title: 'Create Transfer Order',
                      onSave: itemUuids => {
                        const createStockTransfer: WIPCreateStockTransfer = {
                          name: null,
                          fromLocationId: null,
                          toLocationId: createGid('Location', session.currentSession.locationId),
                          lineItems: itemUuids
                            .map<CreateStockTransfer['lineItems'][number] | null>(uuid => {
                              const workOrderItem = workOrder.items.find(hasPropertyValue('uuid', uuid));

                              if (!workOrderItem) {
                                return null;
                              }

                              if (workOrderItem.type !== 'product') {
                                return null;
                              }

                              const { productVariantId, quantity, shopifyOrderLineItem } = workOrderItem;
                              const productVariantQuery = productVariantQueries[productVariantId];
                              const inventoryItemId = productVariantQuery?.data?.inventoryItem.id;

                              if (!productVariantQuery?.data || !inventoryItemId) {
                                return null;
                              }

                              const {
                                product: { title: productTitle },
                                title: productVariantTitle,
                              } = productVariantQuery.data;

                              return {
                                // can just recycle the work order item uuid
                                uuid,
                                status: 'PENDING',
                                quantity,
                                inventoryItemId,
                                shopifyOrderLineItem,
                                productTitle,
                                productVariantTitle,
                              };
                            })
                            .filter(isNonNullable),
                          note: '',
                        };

                        if (createStockTransfer.lineItems.length !== itemUuids.length) {
                          toast.show('Some items could not be added to the transfer order');
                          return;
                        }

                        router.push('StockTransfer', { initial: createStockTransfer });
                      },
                    },
                  },
                },
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
    const availableInventoryCount = match(item)
      .with({ type: 'product' }, item => {
        const productVariantQuery = productVariantQueries[item.productVariantId];

        if (!productVariantQuery?.data) {
          return null;
        }

        const inventoryItemId = productVariantQuery.data.inventoryItem.id;
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
        label:
          `${item.quantity} × ` +
          match(item)
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
        badges: getWorkOrderItemFulfillmentBadges(workOrder, item),
        subtitle,
      },
      rightSide: { showChevron: true },
    };
  });
}

export function getWorkOrderItemFulfillmentBadges(
  workOrder: DetailedWorkOrder,
  item: DetailedWorkOrderItem,
): BadgeProps[] {
  const purchaseOrders = item.type !== 'product' ? [] : item.purchaseOrders;
  const transferOrders = item.type !== 'product' ? [] : item.transferOrders;
  const shopifyOrderId = item.shopifyOrderLineItem?.orderId;
  const shopifyOrder = !shopifyOrderId
    ? undefined
    : workOrder.orders.filter(hasPropertyValue('type', 'ORDER')).find(hasPropertyValue('id', shopifyOrderId));

  // General status that shows whether the line item has committed inventory, is waiting for a PO/TO, or still required sourcing.
  const statusBadge: BadgeProps = (() => {
    if (shopifyOrder) {
      // If the item has a shopify order we are done as it will have been committed or fulfilled
      return {
        text: 'Sourced',
        status: 'complete',
        variant: 'success',
      };
    }

    const poQuantity = sum(purchaseOrders.flatMap(po => po.items.map(item => item.quantity)));
    const poAvailableQuantity = sum(purchaseOrders.flatMap(po => po.items.map(item => item.availableQuantity)));

    if (poAvailableQuantity < poQuantity) {
      // Not all PO items have been sourced
      return {
        text: 'Pending inventory',
        status: poAvailableQuantity === 0 ? 'empty' : 'partial',
        variant: 'warning',
      };
    }

    const incomingTransferOrderItemCount = sum(
      transferOrders.flatMap(to =>
        to.items.filter(item => item.status === 'PENDING' || item.status === 'IN_TRANSIT').map(item => item.quantity),
      ),
    );
    const transferOrderItemCount = sum(transferOrders.flatMap(to => to.items.map(item => item.quantity)));

    if (incomingTransferOrderItemCount > 0) {
      return {
        text: 'Pending inventory',
        status: incomingTransferOrderItemCount < transferOrderItemCount ? 'partial' : 'empty',
        variant: 'warning',
      };
    }

    // No source for this line item yet, so you must create a SO/TO/PO
    return {
      text: 'Requires sourcing',
      status: 'empty',
      variant: 'critical',
    };
  })();

  return [
    statusBadge,
    ...[shopifyOrder]
      .filter(isNonNullable)
      .filter(hasPropertyValue('type', 'ORDER'))
      .map<BadgeProps>(so => ({ text: so.name, variant: 'highlight' })),
    ...purchaseOrders.map<BadgeProps>(po => getPurchaseOrderBadge(po, true)),
    ...transferOrders.map<BadgeProps>(to => getTransferOrderBadge(to, true)),
  ];
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
