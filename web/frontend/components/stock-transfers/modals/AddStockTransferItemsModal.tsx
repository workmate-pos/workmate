import { useState } from 'react';
import { useToast } from '@teifi-digital/shopify-app-react';
import {
  WIPCreateStockTransfer,
  CreateStockTransferDispatchProxy,
} from '@work-orders/common/create-stock-transfer/reducer.js';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { Modal, ResourceItem, Thumbnail, Text, InlineStack, Button, Badge, BlockStack } from '@shopify/polaris';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { uuid } from '@work-orders/common/util/uuid.js';
import { CreateStockTransferLineItemStatus } from '@web/schemas/generated/create-stock-transfer.js';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { Int } from '@web/schemas/generated/create-stock-transfer.js';
import { StockTransferLineItem } from '@web/schemas/generated/create-stock-transfer.js';
import { useInventoryItemQueries } from '@work-orders/common/queries/use-inventory-item-query.js';
import { unique } from '@teifi-digital/shopify-app-toolbox/array';
import { ProductVariant } from '@work-orders/common/queries/use-product-variants-query.js';
import { ProductVariantSelector } from '../../selectors/ProductVariantSelector.js';

type Props = {
  open: boolean;
  onClose: () => void;
  createStockTransfer: WIPCreateStockTransfer;
  dispatch: CreateStockTransferDispatchProxy;
};

export function AddStockTransferItemsModal({ open, onClose, createStockTransfer, dispatch }: Props) {
  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });
  const [selectedVariants, setSelectedVariants] = useState<Record<ID, number>>({});

  const [allProductVariants, setAllProductVariants] = useState<ProductVariant[]>([]);

  const inventoryItemIds = unique(allProductVariants.map(variant => variant.inventoryItem.id));
  const inventoryItemQueries = useInventoryItemQueries({
    fetch,
    ids: inventoryItemIds,
    locationId: createStockTransfer.fromLocationId,
  });

  const handleQuantityChange = (variantId: ID, quantity: number) => {
    setSelectedVariants(prev => ({
      ...prev,
      [variantId]: Math.max(0, quantity),
    }));
  };

  const handleAddItems = () => {
    const lineItems = Object.entries(selectedVariants)
      .filter(([, quantity]) => quantity > 0)
      .map(([variantId, quantity]) => {
        const variant = allProductVariants.find(v => v.id === variantId);
        if (!variant) return null;

        const item: StockTransferLineItem = {
          uuid: uuid(),
          quantity: quantity as Int,
          status: 'PENDING' satisfies CreateStockTransferLineItemStatus,
          inventoryItemId: variant.inventoryItem.id,
          productTitle: variant.product.title,
          productVariantTitle: variant.title,
          purchaseOrderLineItem: null,
          shopifyOrderLineItem: null,
        };

        return item;
      })
      .filter((item): item is StockTransferLineItem => item !== null);

    if (lineItems.length === 0) {
      setToastAction({ content: 'Please select at least one item' });
      return;
    }

    dispatch.addLineItems({ lineItems });
    onClose();
    setSelectedVariants({});
    setAllProductVariants([]);
    setToastAction({ content: 'Items added successfully' });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add Stock Transfer Items"
      primaryAction={{
        content: 'Add items',
        onAction: handleAddItems,
        disabled: Object.values(selectedVariants).every(q => q === 0),
      }}
      secondaryActions={[
        {
          content: 'Cancel',
          onAction: onClose,
        },
      ]}
    >
      <ProductVariantSelector
        filters={{
          locationId: createStockTransfer.fromLocationId,
        }}
        renderItem={variant => {
          setAllProductVariants(prevVariants => {
            if (!prevVariants.some(v => v.id === variant.id)) {
              return [...prevVariants, variant];
            }
            return prevVariants;
          });

          const inventoryItem = inventoryItemQueries[variant.inventoryItem.id]?.data;
          const availableQuantity =
            inventoryItem?.inventoryLevel?.quantities.find(q => q.name === 'available')?.quantity ?? 0;

          return (
            <ResourceItem
              id={variant.id}
              media={
                <Thumbnail
                  source={variant.image?.url ?? variant.product.featuredImage?.url ?? ''}
                  alt={getProductVariantName(variant) ?? ''}
                />
              }
              accessibilityLabel={`Add ${getProductVariantName(variant)} to transfer`}
              onClick={() => {}}
            >
              <BlockStack gap="200">
                <Text as="h2" variant="bodyMd" fontWeight="bold">
                  {getProductVariantName(variant)}
                </Text>

                <InlineStack gap="200" align="space-between">
                  <InlineStack gap="200">
                    <Badge tone="info">{`Available: ${availableQuantity}`}</Badge>
                    {variant.sku && <Badge>{`SKU: ${variant.sku}`}</Badge>}
                  </InlineStack>

                  <InlineStack gap="200" align="center">
                    <Button
                      size="slim"
                      disabled={selectedVariants[variant.id] === 0}
                      onClick={() => handleQuantityChange(variant.id, (selectedVariants[variant.id] ?? 0) - 1)}
                    >
                      -
                    </Button>
                    <Text as="p">{selectedVariants[variant.id] ?? 0}</Text>
                    <Button
                      size="slim"
                      disabled={(selectedVariants[variant.id] ?? 0) >= availableQuantity}
                      onClick={() => handleQuantityChange(variant.id, (selectedVariants[variant.id] ?? 0) + 1)}
                    >
                      +
                    </Button>
                  </InlineStack>
                </InlineStack>
              </BlockStack>
            </ResourceItem>
          );
        }}
      />
      {toast}
    </Modal>
  );
}
