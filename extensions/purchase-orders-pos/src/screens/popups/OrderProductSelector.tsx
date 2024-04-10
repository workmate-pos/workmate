import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { useScreen } from '@teifi-digital/pos-tools/router';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { Product } from '@web/schemas/generated/create-purchase-order.js';
import { useOrderQuery } from '@work-orders/common/queries/use-order-query.js';
import { OrderLineItem, useOrderLineItemsQuery } from '@work-orders/common/queries/use-order-line-items-query.js';
import { Button, List, ListRow, ScrollView, Stack, Text } from '@shopify/retail-ui-extensions-react';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { Dispatch, SetStateAction, useState } from 'react';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { BigDecimal } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { hasNonNullableProperty } from '@teifi-digital/shopify-app-toolbox/guards';
import { Int } from '@web/schemas/generated/create-product.js';
import { useRouter } from '../../routes.js';

/**
 * Similar to ProductSelector, but shows line items of a specific order to be able to link to them.
 */
export function OrderProductSelector({ orderId, onSave }: { orderId: ID; onSave: (products: Product[]) => void }) {
  const fetch = useAuthenticatedFetch();

  const orderQuery = useOrderQuery({ fetch, id: orderId });
  const order = orderQuery?.data?.order;

  const lineItemsQuery = useOrderLineItemsQuery({ fetch, id: orderId });
  const lineItems = lineItemsQuery.data?.pages.flat().filter(hasNonNullableProperty('variant'));
  // TODO: Query to check if the line item is already in a PO
  // TODO: Set default unit cost to line item unit cost (use location)

  const [selectedLineItemIds, setSelectedLineItemIds] = useState<ID[]>([]);

  const router = useRouter();
  const screen = useScreen();
  screen.setIsLoading(orderQuery.isLoading || lineItemsQuery.isLoading);

  if (orderQuery.isError || (!orderQuery.isLoading && !order)) {
    return (
      <Stack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
        <Text color="TextCritical" variant="body">
          {extractErrorMessage(orderQuery.error, 'Error loading order')}
        </Text>
      </Stack>
    );
  }

  if (orderQuery.isError || (!orderQuery.isLoading && !order)) {
    return (
      <Stack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
        <Text color="TextCritical" variant="body">
          {extractErrorMessage(orderQuery.error, 'Error loading order')}
        </Text>
      </Stack>
    );
  }

  if (lineItemsQuery.isError || (!lineItemsQuery.isLoading && !order)) {
    return (
      <Stack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
        <Text color="TextCritical" variant="body">
          {extractErrorMessage(lineItemsQuery.error, 'Error loading order line items')}
        </Text>
      </Stack>
    );
  }

  if (!order) {
    return null;
  }

  if (!lineItems) {
    return null;
  }

  screen.setTitle(`Select Products for ${order.name}`);

  const rows = getOrderLineItemRows(lineItems, selectedLineItemIds, setSelectedLineItemIds);

  return (
    <ScrollView>
      <Text variant={'headingLarge'}>Select Products for {order.name}</Text>
      <List data={rows} onEndReached={() => false} isLoadingMore={false} imageDisplayStrategy={'always'} />
      <Button
        title={'Add selection to Purchase Order'}
        type={'primary'}
        isDisabled={selectedLineItemIds.length === 0}
        onPress={async () => {
          await router.popCurrent();
          onSave(
            lineItems
              .filter(li => selectedLineItemIds.includes(li.id))
              .map(li => {
                return {
                  quantity: li.quantity,
                  productVariantId: li.variant.id,
                  availableQuantity: 0 as Int,
                  unitCost: BigDecimal.ZERO.toMoney(),
                  shopifyOrderLineItem: {
                    orderId: order.id,
                    id: li.id,
                  },
                };
              }),
          );
        }}
      />
    </ScrollView>
  );
}

function getOrderLineItemRows(
  lineItems: OrderLineItem[],
  selectedLineItemIds: ID[],
  setSelectedLineItemIds: Dispatch<SetStateAction<ID[]>>,
) {
  return lineItems.map<ListRow>(lineItem => {
    const name = getProductVariantName(lineItem.variant) ?? 'Unknown product';
    const isSelected = selectedLineItemIds.includes(lineItem.id);

    return {
      id: lineItem.id,
      onPress() {
        if (isSelected) {
          setSelectedLineItemIds(current => current.filter(id => id !== lineItem.id));
        } else {
          setSelectedLineItemIds(current => [...current, lineItem.id]);
        }
      },
      leftSide: {
        label: name,
        subtitle: lineItem.sku ? [lineItem.sku] : undefined,
        image: {
          badge: lineItem.quantity,
          source: lineItem.variant?.image?.url ?? lineItem?.variant?.product?.featuredImage?.url,
        },
      },
      rightSide: {
        toggleSwitch: {
          value: isSelected,
        },
      },
    };
  });
}
