import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { useScreen } from '@teifi-digital/pos-tools/router';
import { ID, parseGid } from '@teifi-digital/shopify-app-toolbox/shopify';
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
import { v4 as uuid } from 'uuid';
import { useDraftOrderQuery } from '@work-orders/common/queries/use-draft-order-query.js';
import {
  DraftOrderLineItem,
  useDraftOrderLineItemsQuery,
} from '@work-orders/common/queries/use-draft-order-line-items-query.js';
import { useCustomFieldsPresetsQuery } from '@work-orders/common/queries/use-custom-fields-presets-query.js';

/**
 * Similar to ProductSelector, but shows line items of a specific order to be able to link to them.
 */
export function OrderProductSelector({ orderId, onSave }: { orderId: ID; onSave: (products: Product[]) => void }) {
  const fetch = useAuthenticatedFetch();

  const isDraftOrder = parseGid(orderId).objectName === 'DraftOrder';

  const customFieldsPresetsQuery = useCustomFieldsPresetsQuery({ fetch, type: 'LINE_ITEM' });

  const orderQuery = useOrderQuery({ fetch, id: orderId }, { enabled: !isDraftOrder });
  const draftOrderQuery = useDraftOrderQuery({ fetch, id: orderId }, { enabled: isDraftOrder });

  const currentOrderQuery = isDraftOrder ? draftOrderQuery : orderQuery;
  const currentOrder = currentOrderQuery.data?.order;

  const orderLineItemsQuery = useOrderLineItemsQuery({ fetch, id: orderId }, { enabled: !isDraftOrder });
  const draftOrderLineItemsQuery = useDraftOrderLineItemsQuery({ fetch, id: orderId }, { enabled: isDraftOrder });

  const currentLineItemsQuery = isDraftOrder ? draftOrderLineItemsQuery : orderLineItemsQuery;
  const currentLineItems = currentLineItemsQuery.data?.pages.flat().filter(hasNonNullableProperty('variant'));

  // TODO: Query to check if the line item is already in a PO
  // TODO: Set default unit cost to line item unit cost (use location)

  const [selectedLineItemIds, setSelectedLineItemIds] = useState<ID[]>([]);

  const router = useRouter();
  const screen = useScreen();

  const isLoading = orderQuery.isLoading || orderLineItemsQuery.isLoading || customFieldsPresetsQuery.isLoading;
  screen.setIsLoading(isLoading);

  if (isLoading) {
    return null;
  }

  if (currentOrderQuery.isError || !currentOrder) {
    return (
      <Stack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
        <Text color="TextCritical" variant="body">
          {extractErrorMessage(currentOrderQuery.error, 'Error loading order')}
        </Text>
      </Stack>
    );
  }

  if (currentLineItemsQuery.isError || !currentLineItems) {
    return (
      <Stack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
        <Text color="TextCritical" variant="body">
          {extractErrorMessage(currentLineItemsQuery.error, 'Error loading order line items')}
        </Text>
      </Stack>
    );
  }

  if (customFieldsPresetsQuery.isError || !customFieldsPresetsQuery.data) {
    return (
      <Stack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
        <Text color="TextCritical" variant="body">
          {extractErrorMessage(customFieldsPresetsQuery.error, 'Error loading custom fields presets')}
        </Text>
      </Stack>
    );
  }

  if (!currentOrder) {
    return null;
  }

  if (!currentLineItems) {
    return null;
  }

  screen.setTitle(`Select Products for ${currentOrder.name}`);

  const rows = getOrderLineItemRows(currentLineItems, selectedLineItemIds, setSelectedLineItemIds);

  return (
    <ScrollView>
      <Text variant={'headingLarge'}>Select Products for {currentOrder.name}</Text>
      <List data={rows} onEndReached={() => false} isLoadingMore={false} imageDisplayStrategy={'always'} />
      <Button
        title={'Add selection to Purchase Order'}
        type={'primary'}
        isDisabled={selectedLineItemIds.length === 0}
        onPress={async () => {
          await router.popCurrent();
          onSave(
            currentLineItems
              .filter(li => selectedLineItemIds.includes(li.id))
              .map(li => {
                return {
                  uuid: uuid(),
                  quantity: li.quantity,
                  productVariantId: li.variant.id,
                  availableQuantity: 0 as Int,
                  unitCost: BigDecimal.ZERO.toMoney(),
                  shopifyOrderLineItem: {
                    orderId: currentOrder.id,
                    id: li.id,
                  },
                  customFields: customFieldsPresetsQuery.data.defaultCustomFields,
                };
              }),
          );
        }}
      />
    </ScrollView>
  );
}

function getOrderLineItemRows(
  lineItems: (OrderLineItem | DraftOrderLineItem)[],
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
