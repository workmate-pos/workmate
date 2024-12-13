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
import { hasPropertyValue } from '@teifi-digital/shopify-app-toolbox/guards';
import { ReactNode, useState } from 'react';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { PurchaseOrderLineItemModal } from '@web/frontend/components/purchase-orders/modals/PurchaseOrderLineItemModal.js';
import { Tone } from '@shopify/polaris/build/ts/src/components/Badge/index.js';
import { useCurrencyFormatter } from '@work-orders/common/hooks/use-currency-formatter.js';
import { BigDecimal } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { DetailedPurchaseOrder } from '@web/services/purchase-orders/types.js';

export function PurchaseOrderProductsCard({
  createPurchaseOrder,
  purchaseOrder,
  dispatch,
  disabled,
  onAddProductClick,
  action,
}: {
  createPurchaseOrder: CreatePurchaseOrder;
  purchaseOrder: DetailedPurchaseOrder | null;
  dispatch: CreatePurchaseOrderDispatchProxy;
  disabled: boolean;
  onAddProductClick: () => void;
  action?: ReactNode;
}) {
  return (
    <Card>
      <BlockStack gap={'400'}>
        <InlineStack align={'space-between'}>
          <Text as={'h2'} variant={'headingMd'} fontWeight={'bold'}>
            Products
          </Text>

          <ButtonGroup>{action}</ButtonGroup>
        </InlineStack>

        <ProductsList
          createPurchaseOrder={createPurchaseOrder}
          purchaseOrder={purchaseOrder}
          dispatch={dispatch}
          disabled={disabled}
        />
        <ButtonGroup fullWidth>
          <Button onClick={() => onAddProductClick()} disabled={disabled}>
            Add product
          </Button>
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

  // TODO: TO/SO info (just like pos)

  const isLoading = Object.values(productVariantQueries).some(query => query.isLoading);

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
          const name = getProductVariantName(productVariant) ?? 'Unknown product';
          const imageUrl = productVariant?.image?.url ?? productVariant?.product?.featuredImage?.url;

          const availableQuantity =
            purchaseOrder?.receipts
              .flatMap(receipt => receipt.lineItems)
              .filter(hasPropertyValue('uuid', item.uuid))
              .map(lineItem => lineItem.quantity)
              .reduce((a, b) => a + b, 0) ?? 0;

          const quantityBadgeTone: Tone | undefined = disabled
            ? undefined
            : availableQuantity >= item.quantity
              ? 'success'
              : undefined;

          const canRemove = !purchaseOrder?.receipts
            .flatMap(receipt => receipt.lineItems)
            .some(hasPropertyValue('uuid', item.uuid));

          return (
            <ResourceItem
              id={id}
              onClick={() => onLineItemClick(item)}
              disabled={disabled}
              shortcutActions={canRemove ? [{ content: 'Remove', onAction: () => onLineItemRemove(item) }] : []}
            >
              {!productVariant && (
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
                        {`${availableQuantity.toString()} / ${item.quantity.toString()}`}
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
                  {item.specialOrderLineItem && (
                    <Box>
                      <Badge tone={'info'}>{item.specialOrderLineItem.name}</Badge>
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
