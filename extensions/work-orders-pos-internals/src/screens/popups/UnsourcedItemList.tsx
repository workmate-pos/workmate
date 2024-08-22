import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { ListPopup } from './ListPopup.js';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { unique } from '@teifi-digital/shopify-app-toolbox/array';
import { useProductVariantQueries } from '@work-orders/common/queries/use-product-variant-query.js';
import { useState } from 'react';
import { useScreen } from '@teifi-digital/pos-tools/router';
import { ButtonType, ScrollView, Stack, Text, useExtensionApi } from '@shopify/retail-ui-extensions-react';
import { useReserveLineItemsInventoryMutation } from '@work-orders/common/queries/use-reserve-line-items-inventory-mutation.js';
import { useRouter } from '../../routes.js';
import { hasPropertyValue } from '@teifi-digital/shopify-app-toolbox/guards';
import { UUID } from '@web/util/types.js';

export type UnsourcedItemListSelectedItems = {
  uuid: UUID;
  shopifyOrderLineItem: { id: ID; orderId: ID };
  productVariantId: ID;
  unsourcedQuantity: number;
  quantity: number;
  availableQuantity: number;
};

export type UnsourcedItemListProps = {
  items: UnsourcedItemListSelectedItems[];
  primaryAction: {
    title: string;
    allowEmptySelection?: boolean;
    onAction: (selectedItems: UnsourcedItemListSelectedItems[]) => void;
    loading: boolean;
  };
};

export function UnsourcedItemList({ items: initialSelectedItems, primaryAction }: UnsourcedItemListProps) {
  const { toast } = useExtensionApi<'pos.home.modal.render'>();

  const [selectedItems, setSelectedItems] = useState(initialSelectedItems);

  const fetch = useAuthenticatedFetch();
  const productVariantIds = unique(initialSelectedItems.map(item => item.productVariantId));
  const productVariantQueries = useProductVariantQueries({ fetch, ids: productVariantIds });

  const reserveLineItemInventoryMutation = useReserveLineItemsInventoryMutation({ fetch });

  const getListPopupItem = (item: UnsourcedItemListSelectedItems) => ({
    id: item.uuid,
    leftSide: {
      label: getProductVariantName(productVariantQueries[item.productVariantId]?.data) ?? 'Unknown product',
      subtitle: [
        `${item.unsourcedQuantity} unsourced`,
        Number.isFinite(item.availableQuantity) ? `${item.availableQuantity} available` : '',
      ] as const,
      image: {
        source:
          productVariantQueries[item.productVariantId]?.data?.image?.url ??
          productVariantQueries[item.productVariantId]?.data?.product?.featuredImage?.url,
        badge: item.quantity,
      },
    },
  });

  const screen = useScreen();
  screen.setIsLoading(Object.values(productVariantQueries).some(query => query.isLoading));

  const router = useRouter();

  return (
    <ListPopup
      title="Select items to reserve"
      imageDisplayStrategy="always"
      selection={{
        type: 'multi-select',
        items: initialSelectedItems.map(item => {
          const selectedItem = selectedItems.find(hasPropertyValue('uuid', item.uuid));
          return getListPopupItem(selectedItem ?? item);
        }),
        initialSelection: initialSelectedItems.map(item => item.uuid),
        onSelect: selected => setSelectedItems(initialSelectedItems.filter(item => selected.includes(item.uuid))),
        onClose: () => setSelectedItems(initialSelectedItems),
      }}
      actions={[
        {
          title: 'Change quantities',
          type: 'plain',
          onAction: () => {
            router.push('QuantityAdjustmentList', {
              items: selectedItems.map(item => ({
                id: item.uuid,
                quantity: item.quantity,
                min: 1,
                max: Math.min(item.unsourcedQuantity, item.availableQuantity),
                name: getProductVariantName(productVariantQueries[item.productVariantId]?.data) ?? 'Unknown product',
              })),
              onChange: items =>
                setSelectedItems(
                  selectedItems.map(item => ({
                    ...item,
                    quantity: items.find(hasPropertyValue('id', item.uuid))?.quantity ?? item.quantity,
                  })),
                ),
            });
          },
          disabled: selectedItems.length === 0,
        },
        {
          title: primaryAction.title,
          type: 'primary',
          disabled: !primaryAction.allowEmptySelection && selectedItems.length === 0,
          loading: primaryAction.loading,
          onAction: () => primaryAction.onAction(selectedItems),
        },
      ]}
      emptyState={
        <Stack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
          <Text variant="body" color="TextSubdued">
            There are no unsourced items
          </Text>
        </Stack>
      }
    />
  );
}
