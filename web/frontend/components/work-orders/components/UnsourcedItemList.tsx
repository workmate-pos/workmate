import { useToast } from '@teifi-digital/shopify-app-react';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { StockTransferLineItem } from '@web/schemas/generated/create-stock-transfer.js';
import { DetailedWorkOrder } from '@web/services/work-orders/types.js';
import { hasNonNullableProperty, hasPropertyValue, isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import {
  getWorkOrderItemSourcedCount,
  useWorkOrderQueries,
} from '@web/frontend/components/work-orders/modals/WorkOrderSourcingModal.js';
import { UUID } from '@work-orders/common/util/uuid.js';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { Dispatch, SetStateAction, useEffect, useMemo, useState } from 'react';
import {
  BlockStack,
  Box,
  InlineGrid,
  InlineStack,
  ResourceItem,
  ResourceList,
  SkeletonThumbnail,
  Text,
  TextField,
  Thumbnail,
} from '@shopify/polaris';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { ProductVariant } from '@work-orders/common/queries/use-product-variants-query.js';

/**
 * List of unsourced items with an adjustable quantity.
 */
export function UnsourcedItemList({
  name,
  includeAvailable,
  max,
  onSelectionChange,
}: {
  name: string | null;
  /**
   * Whether to include the available inventory quantity when determining
   * whether something is sourced.
   * Should generally be included, except for the reserve modal.
   */
  includeAvailable: boolean;
  /**
   * The way the max quantity is determined.
   */
  max: 'available' | 'none';
  onSelectionChange?: (items: (UnsourcedWorkOrderItem & { quantity: number })[]) => void;
}) {
  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });

  const { workOrderQuery, inventoryItemQueries, productVariantQueries } = useWorkOrderQueries(fetch, name);

  const unsourcedItems = useMemo(
    () =>
      !workOrderQuery.data?.workOrder
        ? []
        : getUnsourcedWorkOrderItems(
            workOrderQuery.data.workOrder,
            { includeAvailable },
            Object.values(productVariantQueries)
              .map(query => query.data)
              .filter(isNonNullable),
          ),
    [workOrderQuery.data, productVariantQueries],
  );

  const [itemQuantities, _setItemQuantities] = useState<Record<UUID, number>>({});

  const setItemQuantities: Dispatch<SetStateAction<Record<UUID, number>>> = arg => {
    _setItemQuantities(current => {
      const itemQuantities = typeof arg === 'function' ? arg(current) : arg;
      onSelectionChange?.(
        unsourcedItems
          .map(item => ({ ...item, quantity: itemQuantities[item.uuid] ?? 0 }))
          .filter(({ quantity }) => quantity > 0),
      );
      return itemQuantities;
    });
  };

  useEffect(() => {
    setItemQuantities(Object.fromEntries(unsourcedItems.map(item => [item.uuid, getItemMaxQuantity(item)])));
  }, [unsourcedItems]);

  const resolveItemId = (item: UnsourcedWorkOrderItem) => item.uuid;

  const getItemMaxQuantity = (item: UnsourcedWorkOrderItem) =>
    Math.min(
      item.unsourcedQuantity,
      {
        available: item.availableQuantity,
        none: Infinity,
      }[max],
    );

  const onItemClick = (item: UnsourcedWorkOrderItem) => {
    const quantity = itemQuantities[item.uuid] ?? 0;
    const maxQuantity = getItemMaxQuantity(item);

    setItemQuantities(current => ({ ...current, [item.uuid]: quantity === 0 ? maxQuantity : 0 }));
  };

  return (
    <>
      <ResourceList
        items={unsourcedItems}
        resourceName={{ singular: 'item', plural: 'items' }}
        loading={
          workOrderQuery.isLoading ||
          Object.values(inventoryItemQueries).some(query => query.isLoading) ||
          Object.values(productVariantQueries).some(query => query.isLoading)
        }
        emptyState={
          <Box paddingBlock={'800'} paddingInline={'400'}>
            <BlockStack align="center" inlineAlign="center">
              <Text as="p" variant="bodyMd" fontWeight="bold">
                No items to source
              </Text>
            </BlockStack>
          </Box>
        }
        renderItem={item => {
          // TODO: ProductVariant ResourceItem component

          const productVariant = productVariantQueries[item.productVariantId]?.data;
          const imageUrl = productVariant?.image?.url ?? productVariant?.product.featuredImage?.url;
          const label = getProductVariantName(productVariant) ?? 'Unknown product variant';

          const max = getItemMaxQuantity(item);

          return (
            <ResourceItem id={resolveItemId(item)} onClick={() => onItemClick(item)}>
              <InlineGrid gap={'200'} columns={['twoThirds', 'oneThird']}>
                <InlineStack gap={'400'} wrap={false}>
                  {imageUrl && <Thumbnail source={imageUrl} alt={label} />}
                  {!imageUrl && <SkeletonThumbnail />}
                  <BlockStack gap={'200'}>
                    <Text as="p" variant="bodyMd" fontWeight="bold">
                      {label}
                    </Text>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      {productVariant?.sku}
                    </Text>
                  </BlockStack>
                </InlineStack>

                <span onClick={event => event.stopPropagation()}>
                  <TextField
                    label="Quantity"
                    autoComplete="off"
                    type="number"
                    labelAction={
                      max === 0
                        ? undefined
                        : itemQuantities[item.uuid] !== max
                          ? {
                              content: 'Max',
                              onAction: () => setItemQuantities(current => ({ ...current, [item.uuid]: max })),
                            }
                          : {
                              content: 'Clear',
                              onAction: () => setItemQuantities(current => ({ ...current, [item.uuid]: 0 })),
                            }
                    }
                    min={0}
                    max={getItemMaxQuantity(item)}
                    value={String(itemQuantities[item.uuid] ?? 0)}
                    onChange={value => {
                      if (!!value && Number.isFinite(Number(value)) && Math.round(Number(value)) >= 0) {
                        setItemQuantities(current => ({ ...current, [item.uuid]: Math.round(Number(value)) }));
                      }
                    }}
                  />
                </span>
              </InlineGrid>
            </ResourceItem>
          );
        }}
      />

      {toast}
    </>
  );
}

export type UnsourcedWorkOrderItem = {
  uuid: UUID;
  productVariantId: ID;
  unsourcedQuantity: number;
  availableQuantity: number;
  shopifyOrderLineItem: NonNullable<StockTransferLineItem['shopifyOrderLineItem']>;
};

export function getUnsourcedWorkOrderItems(
  workOrder: DetailedWorkOrder,
  { includeAvailable }: { includeAvailable: boolean },
  productVariants: ProductVariant[],
): UnsourcedWorkOrderItem[] {
  return (
    workOrder.items
      .filter(hasPropertyValue('type', 'product'))
      // very important that this is set bcs the TO/PO line item will not be linked to the WO item in any way
      .filter(hasNonNullableProperty('shopifyOrderLineItem'))
      .filter(
        item => productVariants.find(variant => variant.id === item.productVariantId)?.product.serviceType === null,
      )
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
              quantity,
              availableInventoryQuantity,
            },
            { includeAvailable },
          );
          const unsourcedQuantity = Math.max(0, quantity - sourced);

          return {
            uuid,
            productVariantId,
            unsourcedQuantity,
            availableQuantity: availableInventoryQuantity,
            shopifyOrderLineItem,
          };
        },
      )
      .filter(item => item.unsourcedQuantity > 0)
  );
}
