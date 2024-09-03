import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { usePurchaseOrderQuery } from '@work-orders/common/queries/use-purchase-order-query.js';
import { useScreen } from '@teifi-digital/pos-tools/router';
import { Stack, Text, useExtensionApi } from '@shopify/retail-ui-extensions-react';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { useEffect, useMemo, useState } from 'react';
import { sum, unique } from '@teifi-digital/shopify-app-toolbox/array';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { ProductVariant } from '@work-orders/common/queries/use-product-variants-query.js';
import { useProductVariantQueries } from '@work-orders/common/queries/use-product-variant-query.js';
import { hasPropertyValue, isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import { useRouter } from '../../routes.js';
import { defaultCreateStockTransfer } from '../../create-stock-transfer/default.js';
import { UUID } from '@web/util/types.js';
import { ListPopup, ListPopupItem } from '@work-orders/common-pos/screens/ListPopup.js';

type SelectablePurchaseOrderLineItem = {
  uuid: UUID;
  productVariantId: ID;
  inventoryItemId: ID;
  purchaseOrderQuantity: number;
  purchaseOrderAvailableQuantity: number;
  transferredQuantity: number;
  selectedQuantity: number;
  shopifyOrderLineItem: { id: ID; order: { id: ID; name: string } } | null;
};

function getLineItemListItem(
  lineItem: SelectablePurchaseOrderLineItem & { selectedQuantity?: number },
  productVariant: ProductVariant | undefined | null,
): ListPopupItem<UUID> {
  const label = getProductVariantName(productVariant) ?? 'Unknown product';

  return {
    id: lineItem.uuid,
    leftSide: {
      label,
      image: {
        badge: lineItem.selectedQuantity,
        source: productVariant?.image?.url ?? productVariant?.product?.featuredImage?.url,
      },
      subtitle: [
        `${lineItem.purchaseOrderQuantity} in purchase order`,
        `${lineItem.transferredQuantity} already transferred`,
      ],
      badges: [
        lineItem.shopifyOrderLineItem
          ? ({
              variant: 'highlight',
              text: lineItem.shopifyOrderLineItem.order.name,
            } as const)
          : null,
      ].filter(isNonNullable),
    },
    disabled: lineItem.transferredQuantity >= lineItem.purchaseOrderQuantity,
  };
}

/**
 * Screen that allows you to select products received in a purchase order and transfer them to a different location.
 * Allows you to select at most the products that have been ordered
 */
export function SelectPurchaseOrderProductsToTransfer({ name }: { name: string }) {
  const fetch = useAuthenticatedFetch();
  const purchaseOrderQuery = usePurchaseOrderQuery({ fetch, name });

  const productVariantIds = unique(purchaseOrderQuery.data?.lineItems.map(li => li.productVariant.id) ?? []);
  const productVariantQueries = useProductVariantQueries({ fetch, ids: productVariantIds });

  const selectableItems = useMemo(
    () =>
      purchaseOrderQuery.data?.lineItems.map<SelectablePurchaseOrderLineItem>(
        ({ uuid, productVariant, quantity, availableQuantity, stockTransferLineItems, shopifyOrderLineItem }) => {
          const transferredQuantity = sum(stockTransferLineItems.map(li => li.quantity));
          const selectedQuantity = Math.max(quantity - transferredQuantity, 0);

          return {
            purchaseOrderAvailableQuantity: availableQuantity,
            inventoryItemId: productVariant.inventoryItemId,
            productVariantId: productVariant.id,
            purchaseOrderQuantity: quantity,
            shopifyOrderLineItem: shopifyOrderLineItem,
            transferredQuantity,
            selectedQuantity,
            uuid,
          };
        },
      ) ?? [],
    [purchaseOrderQuery.data],
  );

  const [selectedItems, setSelectedItems] = useState<SelectablePurchaseOrderLineItem[]>([]);

  useEffect(() => {
    setSelectedItems(
      selectableItems
        .filter(li => li.transferredQuantity < li.purchaseOrderQuantity)
        .map(li => ({
          ...li,
          selectedQuantity: Math.max(0, li.purchaseOrderQuantity - li.transferredQuantity),
        })),
    );
  }, [selectableItems]);

  const updateSelection = (uuids: UUID[]) => {
    setSelectedItems(
      uuids.map(uuid => {
        const selectableItem = selectableItems.find(hasPropertyValue('uuid', uuid));
        const selectedItem = selectedItems.find(hasPropertyValue('uuid', uuid));

        return selectedItem ?? selectableItem ?? never('huh');
      }),
    );
  };

  const screen = useScreen();
  screen.setTitle(`${name} - Create Transfer Order`);
  screen.setIsLoading(purchaseOrderQuery.isFetching);

  const router = useRouter();
  const { toast } = useExtensionApi<'pos.home.modal.render'>();

  if (purchaseOrderQuery.isError) {
    return (
      <Stack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
        <Text color="TextCritical" variant="body">
          {extractErrorMessage(purchaseOrderQuery.error, 'An error occurred while loading purchase order')}
        </Text>
      </Stack>
    );
  }

  if (purchaseOrderQuery.isLoading) {
    return null;
  }

  if (!purchaseOrderQuery.data) {
    return (
      <Stack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
        <Text color="TextSubdued" variant="body">
          Purchase order not found
        </Text>
      </Stack>
    );
  }

  return (
    <ListPopup
      title="Select products to transfer"
      selection={{
        type: 'multi-select',
        items: selectableItems.map(item => {
          const selectedItem = selectedItems.find(hasPropertyValue('uuid', item.uuid));
          return getLineItemListItem(selectedItem ?? item, productVariantQueries[item.productVariantId]?.data);
        }),
        initialSelection: selectedItems.map(item => item.uuid),
        onSelect: uuids => updateSelection(uuids),
        actions: [
          {
            title: 'Change quantities',
            type: 'plain',
            disabled: selectedItems.length === 0,
            onAction: () => {
              router.push('QuantityAdjustmentList', {
                items: selectedItems.map(item => ({
                  name: getProductVariantName(productVariantQueries[item.productVariantId]?.data) ?? 'Unknown product',
                  quantity: item.selectedQuantity,
                  min: 1,
                  max: Math.max(item.purchaseOrderQuantity - item.transferredQuantity, 0),
                  id: item.uuid,
                })),
                onChange: changedItems =>
                  setSelectedItems(items =>
                    items.map(item => ({
                      ...item,
                      selectedQuantity:
                        changedItems.find(hasPropertyValue('id', item.uuid))?.quantity ?? item.selectedQuantity,
                    })),
                  ),
              });
            },
          },
          {
            title: 'Create Stock Transfer',
            type: 'primary',
            disabled: selectedItems.length === 0,
            onAction: async () => {
              const lineItems = selectedItems
                .map(item => {
                  const productVariant = productVariantQueries[item.productVariantId]?.data;

                  if (!productVariant) {
                    return null;
                  }

                  return {
                    quantity: item.selectedQuantity,
                    inventoryItemId: item.inventoryItemId,
                    status: 'PENDING',
                    uuid: item.uuid,
                    shopifyOrderLineItem: item.shopifyOrderLineItem
                      ? {
                          id: item.shopifyOrderLineItem.id,
                          orderId: item.shopifyOrderLineItem.order.id,
                        }
                      : null,
                    purchaseOrderLineItem: {
                      uuid: item.uuid,
                      purchaseOrderName: name,
                    },
                    productTitle: productVariant.product.title,
                    productVariantTitle: productVariant.title,
                  } as const;
                })
                .filter(isNonNullable);

              if (lineItems.length !== selectedItems.length) {
                toast.show('Not all products have finished loading, please try again in a bit');
                return;
              }

              // TODO: On close, make this also close the quantity selector
              // TODO: invalidate PO on TO save
              await router.popCurrent();
              router.push('StockTransfer', {
                initial: {
                  ...defaultCreateStockTransfer,
                  fromLocationId: purchaseOrderQuery.data?.location?.id ?? null,
                  lineItems,
                },
              });
            },
          },
        ],
      }}
      imageDisplayStrategy="always"
      useRouter={useRouter}
    />
  );
}
