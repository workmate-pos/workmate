import {
  WIPCreateSpecialOrder,
  getCreateSpecialOrderSetter,
} from '@work-orders/common/create-special-order/default.js';
import { Dispatch, SetStateAction, useState } from 'react';
import { Badge, BlockStack, Card, InlineStack, ResourceItem, ResourceList, Text, Thumbnail } from '@shopify/polaris';
import { useToast } from '@teifi-digital/shopify-app-react';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { CreateSpecialOrder } from '@web/schemas/generated/create-special-order.js';
import { SpecialOrderLineItemModal } from '@web/frontend/components/special-orders/SpecialOrderLineItemModal.js';
import { useProductVariantQueries } from '@work-orders/common/queries/use-product-variant-query.js';
import { unique } from '@teifi-digital/shopify-app-toolbox/array';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { useSpecialOrderQuery } from '@work-orders/common/queries/use-special-order-query.js';
import { hasPropertyValue } from '@teifi-digital/shopify-app-toolbox/guards';

export function SpecialOrderLineItemsCard({
  createSpecialOrder,
  setCreateSpecialOrder,
  disabled,
}: {
  createSpecialOrder: WIPCreateSpecialOrder;
  setCreateSpecialOrder: Dispatch<SetStateAction<WIPCreateSpecialOrder>>;
  disabled: boolean;
}) {
  const setLineItems = getCreateSpecialOrderSetter(setCreateSpecialOrder, 'lineItems');

  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });

  const specialOrderQuery = useSpecialOrderQuery({ fetch, name: createSpecialOrder.name });
  const specialOrder = specialOrderQuery.data;

  const productVariantIds = unique(createSpecialOrder.lineItems.map(li => li.productVariantId));
  const productVariantQueries = useProductVariantQueries({ fetch, ids: productVariantIds });

  const [selectedItem, setSelectedItem] = useState<CreateSpecialOrder['lineItems'][number] | null>(null);

  return (
    <Card>
      <BlockStack gap={'400'}>
        <Text as={'h2'} variant={'headingMd'} fontWeight={'bold'}>
          Line Items
        </Text>

        {selectedItem && (
          <SpecialOrderLineItemModal
            open={!!selectedItem}
            onClose={() => setSelectedItem(null)}
            specialOrderName={createSpecialOrder.name}
            lineItem={selectedItem}
            onSave={lineItem => setLineItems(current => current.map(x => (x.uuid === lineItem.uuid ? lineItem : x)))}
            onRemove={() => setLineItems(current => current.filter(x => x.uuid !== selectedItem.uuid))}
          />
        )}

        <ResourceList
          loading={specialOrderQuery.isLoading || Object.values(productVariantQueries).some(query => query.isLoading)}
          items={createSpecialOrder.lineItems}
          resourceName={{ singular: 'line item', plural: 'line items' }}
          resolveItemId={item => item.uuid}
          renderItem={item => {
            const productVariantQuery = productVariantQueries[item.productVariantId];
            const productVariant = productVariantQuery?.data;

            const imageUrl = productVariant?.image?.url ?? productVariant?.product?.featuredImage?.url;
            const label = productVariantQuery?.isLoading
              ? 'Loading...'
              : getProductVariantName(productVariant) ?? 'Unknown product';

            const specialOrderLineItem = specialOrder?.lineItems.find(hasPropertyValue('uuid', item.uuid));
            const orderId = specialOrderLineItem?.shopifyOrderLineItem?.orderId;

            const purchaseOrderNames = unique(
              specialOrderLineItem?.purchaseOrderLineItems.map(lineItem => lineItem.purchaseOrderName) ?? [],
            );
            const orderNames = orderId ? [specialOrder?.orders.find(order => order.id === orderId)?.name] : [];
            const workOrderNames = orderId
              ? specialOrder?.workOrders.filter(wo => wo.orderIds.includes(orderId)).map(wo => wo.name) ?? []
              : [];

            return (
              <ResourceItem id={item.uuid} onClick={() => setSelectedItem(item)} disabled={disabled}>
                <BlockStack gap={'200'}>
                  <InlineStack gap={'200'} blockAlign={'center'}>
                    <Badge tone="info">{item.quantity.toString()}</Badge>
                    {imageUrl && <Thumbnail alt={label} source={imageUrl} />}
                  </InlineStack>
                  <Text as={'p'} variant={'bodyMd'} fontWeight={'bold'}>
                    {label}
                  </Text>
                  <InlineStack gap={'200'}>
                    {[...workOrderNames, ...orderNames, ...purchaseOrderNames].map(name => (
                      <Badge key={name} tone="info">
                        {name}
                      </Badge>
                    ))}
                  </InlineStack>
                </BlockStack>
              </ResourceItem>
            );
          }}
        />
      </BlockStack>

      {toast}
    </Card>
  );
}
