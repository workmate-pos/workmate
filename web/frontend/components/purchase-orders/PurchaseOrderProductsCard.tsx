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
import { hasPropertyValue, isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { useOrderQueries } from '@work-orders/common/queries/use-order-query.js';
import { useState } from 'react';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { PurchaseOrderLineItemModal } from '@web/frontend/components/purchase-orders/modals/PurchaseOrderLineItemModal.js';
import { Tone } from '@shopify/polaris/build/ts/src/components/Badge/index.js';
import { useCurrencyFormatter } from '@work-orders/common/hooks/use-currency-formatter.js';
import { BigDecimal } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { DetailedPurchaseOrder } from '@web/services/purchase-orders/types.js';
import { useDraftOrderQueries } from '@work-orders/common/queries/use-draft-order-query.js';
import { parseGid } from '@teifi-digital/shopify-app-toolbox/shopify';

export function PurchaseOrderProductsCard({
  createPurchaseOrder,
  purchaseOrder,
  dispatch,
  disabled,
  onAddProductClick,
  onAddOrderProductClick,
  onMarkAllAsReceivedClick,
  onMarkAllAsNotReceivedClick,
}: {
  createPurchaseOrder: CreatePurchaseOrder;
  purchaseOrder: DetailedPurchaseOrder | null;
  dispatch: CreatePurchaseOrderDispatchProxy;
  disabled: boolean;
  onAddProductClick: () => void;
  onAddOrderProductClick: () => void;
  onMarkAllAsReceivedClick: () => void;
  onMarkAllAsNotReceivedClick: () => void;
}) {
  const noLineItems = createPurchaseOrder.lineItems.length === 0;
  const allAreReceived = createPurchaseOrder.lineItems.every(li => li.availableQuantity === li.quantity);
  const noneAreReceived = createPurchaseOrder.lineItems.every(li => {
    const savedLineItem = purchaseOrder?.lineItems.find(hasPropertyValue('uuid', li.uuid));
    const minimumAvailableQuantity = savedLineItem?.availableQuantity ?? (0 as Int);
    return li.availableQuantity === minimumAvailableQuantity;
  });

  return (
    <Card>
      <BlockStack gap={'400'}>
        <Text as={'h2'} variant={'headingMd'} fontWeight={'bold'}>
          Products
        </Text>
        <ProductsList
          createPurchaseOrder={createPurchaseOrder}
          purchaseOrder={purchaseOrder}
          dispatch={dispatch}
          disabled={disabled}
        />
        <ButtonGroup fullWidth>
          <Button onClick={() => onAddProductClick()} disabled={disabled}>
            Add Product
          </Button>
          <Button onClick={() => onAddOrderProductClick()} disabled={disabled}>
            Select from Order
          </Button>
          {noLineItems || allAreReceived ? (
            <Button
              onClick={() => onMarkAllAsNotReceivedClick()}
              disabled={disabled || noLineItems || noneAreReceived}
              tone={'critical'}
            >
              Mark all as not received
            </Button>
          ) : (
            <Button onClick={() => onMarkAllAsReceivedClick()} disabled={disabled || noLineItems || allAreReceived}>
              Mark all as received
            </Button>
          )}
        </ButtonGroup>
      </BlockStack>
    </Card>
  );
}

function ProductsList({
  createPurchaseOrder,
  purchaseOrder,
  dispatch,
  disabled,
}: {
  createPurchaseOrder: CreatePurchaseOrder;
  purchaseOrder: DetailedPurchaseOrder | null;
  dispatch: CreatePurchaseOrderDispatchProxy;
  disabled: boolean;
}) {
  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });
  const currencyFormatter = useCurrencyFormatter({ fetch });

  const productVariantIds = unique(createPurchaseOrder.lineItems.map(li => li.productVariantId));
  const productVariantQueries = useProductVariantQueries({ fetch, ids: productVariantIds });

  const orderIds = unique(
    createPurchaseOrder.lineItems
      .map(li => li.shopifyOrderLineItem?.orderId)
      .filter(isNonNullable)
      .filter(id => parseGid(id).objectName === 'Order'),
  );
  const draftOrderIds = unique(
    createPurchaseOrder.lineItems
      .map(li => li.shopifyOrderLineItem?.orderId)
      .filter(isNonNullable)
      .filter(id => parseGid(id).objectName === 'DraftOrder'),
  );

  const orderQueries = {
    ...useOrderQueries({ fetch, ids: orderIds }),
    ...useDraftOrderQueries({ fetch, ids: draftOrderIds }),
  };

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

          let quantityBadgeTone: Tone | undefined;

          if (item.availableQuantity >= item.quantity) {
            quantityBadgeTone = 'success';
          } else {
            quantityBadgeTone = 'warning';
          }

          if (disabled) {
            quantityBadgeTone = undefined;
          }

          const canRemove =
            purchaseOrder?.lineItems.some(li => li.uuid === item.uuid && item.availableQuantity === 0) ?? true;

          return (
            <ResourceItem
              id={id}
              onClick={() => onLineItemClick(item)}
              disabled={disabled}
              shortcutActions={canRemove ? [{ content: 'Remove', onAction: () => onLineItemRemove(item) }] : []}
            >
              {(!productVariant || !orderQuery?.data?.order) && (
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
                      <Badge tone={quantityBadgeTone}>
                        {`${item.availableQuantity.toString()} / ${item.quantity.toString()}`}
                      </Badge>
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
                  {orderQuery?.data?.order && (
                    <Box>
                      <Badge tone={'info'}>{orderQuery?.data?.order?.name}</Badge>
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
        <PurchaseOrderLineItemModal
          initialProduct={modalLineItem}
          purchaseOrder={purchaseOrder}
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
