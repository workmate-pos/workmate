import { CreatePurchaseOrder, Int } from '@web/schemas/generated/create-purchase-order.js';
import { CreatePurchaseOrderDispatchProxy } from '@work-orders/common/create-purchase-order/reducer.js';
import {
  Badge,
  BlockStack,
  Box,
  Button,
  ButtonGroup,
  Card,
  InlineStack,
  ResourceItem,
  ResourceList,
  SkeletonDisplayText,
  SkeletonThumbnail,
  Text,
  Thumbnail,
} from '@shopify/polaris';
import { useToast } from '@teifi-digital/shopify-app-react';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { unique } from '@teifi-digital/shopify-app-toolbox/array';
import { useProductVariantQueries } from '@work-orders/common/queries/use-product-variant-query.js';
import { isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { useOrderQueries } from '@work-orders/common/queries/use-order-query.js';
import { useState } from 'react';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { LineItemModal } from '@web/frontend/components/purchase-orders/modals/LineItemModal.js';
import { Tone } from '@shopify/polaris/build/ts/src/components/Badge/index.js';
import { useCurrencyFormatter } from '@work-orders/common/hooks/use-currency-formatter.js';
import { BigDecimal } from '@teifi-digital/shopify-app-toolbox/big-decimal';

export function ProductsCard({
  createPurchaseOrder,
  dispatch,
  disabled,
  onAddProductClick,
  onAddOrderProductClick,
}: {
  createPurchaseOrder: CreatePurchaseOrder;
  dispatch: CreatePurchaseOrderDispatchProxy;
  disabled: boolean;
  onAddProductClick: () => void;
  onAddOrderProductClick: () => void;
}) {
  return (
    <Card>
      <BlockStack gap={'400'}>
        <Text as={'h2'} variant={'headingMd'} fontWeight={'bold'}>
          Products
        </Text>
        <ProductsList createPurchaseOrder={createPurchaseOrder} dispatch={dispatch} disabled={disabled} />
        <ButtonGroup fullWidth>
          <Button onClick={() => onAddProductClick()} disabled={disabled}>
            Add Product
          </Button>
          <Button onClick={() => onAddOrderProductClick()} disabled={disabled}>
            Select Product from Order
          </Button>
        </ButtonGroup>
      </BlockStack>
    </Card>
  );
}

function ProductsList({
  createPurchaseOrder,
  dispatch,
  disabled,
}: {
  createPurchaseOrder: CreatePurchaseOrder;
  dispatch: CreatePurchaseOrderDispatchProxy;
  disabled: boolean;
}) {
  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });
  const currencyFormatter = useCurrencyFormatter({ fetch });

  const productVariantIds = unique(createPurchaseOrder.lineItems.map(li => li.productVariantId));
  const productVariantQueries = useProductVariantQueries({ fetch, ids: productVariantIds });

  const orderIds = unique(
    createPurchaseOrder.lineItems.map(li => li.shopifyOrderLineItem?.orderId).filter(isNonNullable),
  );
  const orderQueries = useOrderQueries({ fetch, ids: orderIds });

  const isLoading =
    Object.values(productVariantQueries).some(query => query.isLoading) ||
    Object.values(orderQueries).some(query => query.isLoading);

  const [modalLineItem, setModalLineItem] = useState<CreatePurchaseOrder['lineItems'][number] | null>(null);

  const onLineItemClick = (lineItem: CreatePurchaseOrder['lineItems'][number]) => {
    if (disabled) return;

    setModalLineItem(lineItem);
  };

  const onLineItemRemove = (lineItem: CreatePurchaseOrder['lineItems'][number]) => {
    dispatch.updateProduct({ product: { ...lineItem, quantity: 0 as Int } });
  };

  return (
    <>
      <ResourceList
        items={createPurchaseOrder.lineItems}
        loading={isLoading}
        renderItem={(item, id) => {
          const productVariant = productVariantQueries[item.productVariantId]?.data;
          const name = getProductVariantName(productVariant) ?? 'Unknown Product';
          const imageUrl = productVariant?.image?.url ?? productVariant?.product?.featuredImage?.url;

          const orderQuery = item.shopifyOrderLineItem ? orderQueries[item.shopifyOrderLineItem.orderId] : null;
          const order = orderQuery?.data?.order;

          let quantityBadgeTone: Tone = 'info-strong';

          if (item.quantity === item.availableQuantity) {
            quantityBadgeTone = 'success';
          }

          if (disabled) {
            quantityBadgeTone = 'enabled';
          }

          return (
            <ResourceItem
              id={id}
              onClick={() => onLineItemClick(item)}
              disabled={disabled}
              shortcutActions={[
                {
                  content: 'Remove',
                  onAction: () => onLineItemRemove(item),
                },
              ]}
            >
              {(!productVariant || (orderQuery && !order)) && (
                <InlineStack gap={'200'}>
                  <SkeletonThumbnail size={'small'} />
                  <BlockStack gap={'200'}>
                    <SkeletonDisplayText size={'large'} />
                    <SkeletonDisplayText size={'small'} />
                  </BlockStack>
                </InlineStack>
              )}

              {!!productVariant && (
                <BlockStack gap={'200'}>
                  <InlineStack align={'space-between'} blockAlign={'center'}>
                    <InlineStack gap={'400'}>
                      <Badge tone={quantityBadgeTone}>{item.quantity.toString()}</Badge>
                      {imageUrl && <Thumbnail alt={name} source={imageUrl} />}
                    </InlineStack>
                    <Text as={'p'} variant={'bodyMd'} tone={'subdued'}>
                      {currencyFormatter(
                        BigDecimal.fromMoney(item.unitCost)
                          .multiply(BigDecimal.fromString(item.quantity.toFixed(0)))
                          .toMoney(),
                      )}
                    </Text>
                  </InlineStack>
                  <Text as={'p'} variant={'bodyMd'} fontWeight={'bold'}>
                    {name}
                  </Text>
                  {order && (
                    <Box>
                      <Badge tone={'info'}>{order.name}</Badge>
                    </Box>
                  )}
                  <Text as={'p'} variant={'bodyMd'} tone={'subdued'}>
                    {productVariant.sku}
                  </Text>
                </BlockStack>
              )}
            </ResourceItem>
          );
        }}
      />

      {modalLineItem && (
        <LineItemModal
          initialProduct={modalLineItem}
          locationId={createPurchaseOrder.locationId}
          open={!!modalLineItem}
          onClose={() => setModalLineItem(null)}
          setToastAction={setToastAction}
          onSave={product => dispatch.updateProduct({ product })}
        />
      )}

      {toast}
    </>
  );
}
