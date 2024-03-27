import { createGid, ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { ToastActionCallable } from '@teifi-digital/shopify-app-react';
import { CreatePurchaseOrder, Int } from '@web/schemas/generated/create-purchase-order.js';
import { useOrderQuery } from '@work-orders/common/queries/use-order-query.js';
import { hasNonNullableProperty, isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { useOrderLineItemsQuery } from '@work-orders/common/queries/use-order-line-items-query.js';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { useState } from 'react';
import { Badge, BlockStack, InlineStack, Modal, ResourceItem, ResourceList, Text, Thumbnail } from '@shopify/polaris';
import { BigDecimal } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { useProductVariantQueries } from '@work-orders/common/queries/use-product-variant-query.js';
import { unique } from '@teifi-digital/shopify-app-toolbox/array';
import { useInventoryItemQueries } from '@work-orders/common/queries/use-inventory-item-query.js';
import { useCurrencyFormatter } from '@work-orders/common/hooks/use-currency-formatter.js';

/**
 * List of line items in an order to select from.
 */
export function SelectOrderProductModal({
  open,
  onClose,
  onSelect,
  orderId,
  setToastAction,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (products: CreatePurchaseOrder['lineItems'][number][]) => void;
  orderId: ID;
  setToastAction: ToastActionCallable;
}) {
  const fetch = useAuthenticatedFetch({ setToastAction });
  const currencyFormatter = useCurrencyFormatter({ fetch });

  const orderQuery = useOrderQuery({ fetch, id: orderId });
  const order = orderQuery?.data?.order;

  const lineItemsQuery = useOrderLineItemsQuery({ fetch, id: orderId });
  const lineItems = lineItemsQuery.data?.pages?.flat().filter(hasNonNullableProperty('variant')) ?? [];

  const productVariantIds = unique(lineItems.map(({ variant }) => variant.id));
  const productVariantQueries = useProductVariantQueries({ fetch, ids: productVariantIds });
  const productVariants = Object.values(productVariantQueries)
    .map(query => query.data)
    .filter(isNonNullable);

  const inventoryItemIds = unique(productVariants.map(pv => pv.inventoryItem.id));
  const inventoryItemQueries = useInventoryItemQueries({
    fetch,
    ids: inventoryItemIds,
    locationId: null,
  });

  const [selectedLineItems, setSelectedLineItems] = useState<typeof lineItems>([]);

  let title = 'Select Order Products';

  if (order) {
    title = `Select Order ${order.name} Products`;
  }

  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      loading={orderQuery.isLoading}
      primaryAction={{
        content: 'Select products',
        onAction: () => {
          onSelect(
            selectedLineItems.map(li => {
              const productVariant = productVariantQueries[li.variant.id]?.data;
              const inventoryItem = productVariant
                ? inventoryItemQueries[productVariant?.inventoryItem.id]?.data
                : null;
              const unitCost = inventoryItem?.unitCost?.amount;

              return {
                availableQuantity: 0 as Int,
                productVariantId: li.variant.id,
                quantity: li.quantity,
                unitCost: BigDecimal.fromString(unitCost ?? '0.00').toMoney(),
                shopifyOrderLineItem: {
                  orderId,
                  id: li.id,
                },
              };
            }),
          );
          onClose();
        },
      }}
    >
      <ResourceList
        loading={
          lineItemsQuery.isLoading ||
          Object.values(productVariantQueries).some(query => query.isLoading) ||
          Object.values(inventoryItemQueries).some(query => query.isLoading)
        }
        items={lineItems}
        selectable
        selectedItems={selectedLineItems.map(li => li.id)}
        onSelectionChange={selection => {
          if (selection === 'All') {
            setSelectedLineItems(lineItems);
            return;
          }

          setSelectedLineItems(lineItems.filter(li => selection.includes(li.id)));
        }}
        resolveItemId={li => li.id}
        renderItem={lineItem => {
          const imageUrl = lineItem.variant.image?.url ?? lineItem.variant.product.featuredImage?.url;
          const name = getProductVariantName(lineItem.variant) ?? 'Unknown product';

          const productVariant = productVariantQueries[lineItem.variant.id]?.data;
          const inventoryItem = productVariant ? inventoryItemQueries[productVariant?.inventoryItem.id]?.data : null;
          const unitCost = inventoryItem?.unitCost?.amount;
          const totalCost = BigDecimal.fromString(unitCost ?? '0.00')
            .multiply(BigDecimal.fromString(lineItem.quantity.toFixed(0)))
            .toMoney();

          return (
            <ResourceItem
              id={lineItem.id}
              onClick={() => {
                setSelectedLineItems(current => {
                  if (current.includes(lineItem)) {
                    return current.filter(l => l !== lineItem);
                  } else {
                    return [...current, lineItem];
                  }
                });
              }}
            >
              <BlockStack gap={'200'}>
                <InlineStack align={'space-between'} blockAlign={'center'}>
                  <InlineStack gap={'400'}>
                    <Badge tone="info-strong">{String(lineItem.quantity)}</Badge>
                    {imageUrl && <Thumbnail alt={name} source={imageUrl} />}
                  </InlineStack>
                  <Text as={'p'} variant={'bodyMd'} tone={'subdued'}>
                    {currencyFormatter(totalCost)}
                  </Text>
                </InlineStack>
                <Text as={'p'} variant={'bodyMd'} fontWeight={'bold'}>
                  {name}
                </Text>
                <Text as={'p'} variant={'bodyMd'} tone={'subdued'}>
                  {lineItem.sku}
                </Text>
              </BlockStack>
            </ResourceItem>
          );
        }}
      />
    </Modal>
  );
}
