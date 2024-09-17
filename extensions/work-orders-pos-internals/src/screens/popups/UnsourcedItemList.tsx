import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { unique } from '@teifi-digital/shopify-app-toolbox/array';
import { useProductVariantQueries } from '@work-orders/common/queries/use-product-variant-query.js';
import { ReactNode, useEffect, useState } from 'react';
import { useScreen } from '@teifi-digital/pos-tools/router';
import { Stack, Text } from '@shopify/ui-extensions-react/point-of-sale';
import { useRouter } from '../../routes.js';
import { hasPropertyValue, isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { UUID } from '@work-orders/common/util/uuid.js';
import { ListPopup } from '@work-orders/common-pos/screens/ListPopup.js';

export type UnsourcedItemListSelectedItem = {
  uuid: UUID;
  shopifyOrderLineItem: { id: ID; orderId: ID };
  productVariantId: ID;
  unsourcedQuantity: number;
  quantity: number;
  availableQuantity: number;
};

export type UnsourcedItemListProps = {
  title: string;
  items: UnsourcedItemListSelectedItem[];
  filterAction?: {
    title: string;
    onAction: () => void;
    loading?: boolean;
    disabled?: boolean;
  };
  primaryAction?: {
    title: string;
    allowEmptySelection?: boolean;
    onAction: (selectedItems: UnsourcedItemListSelectedItem[]) => void;
    loading?: boolean;
  };
  children?: ReactNode;
};

export function UnsourcedItemList({
  title,
  items: listedItems,
  primaryAction,
  filterAction,
  children,
}: UnsourcedItemListProps) {
  const [selectedItems, setSelectedItems] = useState(listedItems);

  // Reset selection if input changes, e.g. when a filter is applied
  useEffect(() => {
    setSelectedItems(listedItems);
  }, [JSON.stringify(listedItems)]);

  const fetch = useAuthenticatedFetch();
  const productVariantIds = unique(listedItems.map(item => item.productVariantId));
  const productVariantQueries = useProductVariantQueries({ fetch, ids: productVariantIds });

  const getListPopupItem = (item: UnsourcedItemListSelectedItem) => ({
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
      title={title}
      imageDisplayStrategy="always"
      selection={{
        type: 'multi-select',
        items: listedItems.map(item => {
          const selectedItem = selectedItems.find(hasPropertyValue('uuid', item.uuid));
          return getListPopupItem(selectedItem ?? item);
        }),
        initialSelection: listedItems.map(item => item.uuid),
        onSelect: selected => setSelectedItems(listedItems.filter(item => selected.includes(item.uuid))),
        onClose: () => setSelectedItems(listedItems),
        actions: [
          !!filterAction
            ? ({
                title: filterAction.title,
                type: 'basic',
                onAction: filterAction.onAction,
                loading: filterAction.loading,
                disabled: filterAction.disabled,
                position: 'top',
              } as const)
            : null,
          !!primaryAction
            ? ({
                title: 'Change quantities',
                type: 'plain',
                onAction: () => {
                  router.push('QuantityAdjustmentList', {
                    items: selectedItems.map(item => ({
                      id: item.uuid,
                      quantity: item.quantity,
                      min: 1,
                      max: Math.min(item.unsourcedQuantity, item.availableQuantity),
                      name:
                        getProductVariantName(productVariantQueries[item.productVariantId]?.data) ?? 'Unknown product',
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
              } as const)
            : null,
          !!primaryAction
            ? ({
                title: primaryAction.title,
                type: 'primary',
                disabled: !primaryAction.allowEmptySelection && selectedItems.length === 0,
                loading: primaryAction.loading,
                onAction: () => primaryAction.onAction(selectedItems),
              } as const)
            : null,
        ].filter(isNonNullable),
      }}
      emptyState={
        <Stack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
          <Text variant="body" color="TextSubdued">
            There are no unsourced items
          </Text>
        </Stack>
      }
      useRouter={useRouter}
    >
      {children}
    </ListPopup>
  );
}
