import { createGid, ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { sum, unique } from '@teifi-digital/shopify-app-toolbox/array';
import { ScrollView, Stack, Text, useExtensionApi } from '@shopify/retail-ui-extensions-react';
import { useProductVariantQueries } from '@work-orders/common/queries/use-product-variant-query.js';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { useUnbatchedInventoryItemQueries } from '@work-orders/common/queries/use-inventory-item-query.js';
import { useLocationsQuery } from '@work-orders/common/queries/use-locations-query.js';
import { useEffect } from 'react';
import { useScreen } from '@teifi-digital/pos-tools/router';
import { hasNonNullableProperty, hasPropertyValue, isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { zip } from '@teifi-digital/shopify-app-toolbox/iteration';
import { ListPopup, ListPopupItem } from './ListPopup.js';
import { useRouter } from '../../routes.js';
import { ProductVariant } from '@work-orders/common/queries/use-product-variants-query.js';
import { StockTransferLineItem } from '@web/schemas/generated/create-stock-transfer.js';
import { UnsourcedWorkOrderItem } from './WorkOrderItemSourcing.js';
import { defaultCreateStockTransfer } from '../../create-stock-transfer/default.js';

/**
 * Select a transfer order location given a list of items that should be transferred.
 * Will display all locations, along with the total quantity among all products that can be transferred from that location.
 * Will show locations in order of most to least items.
 */
export function CreateTransferOrderForLocation({
  toLocationId,
  products,
}: {
  toLocationId: ID;
  products: UnsourcedWorkOrderItem[];
}) {
  const productVariantIds = unique(products.map(product => product.productVariantId));
  const { items, locations } = useTransferOrderLocationItems(products);

  const { toast } = useExtensionApi<'pos.home.modal.render'>();
  const router = useRouter();

  if (productVariantIds.length === 0) {
    return (
      <ScrollView>
        <Stack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
          <Text color="TextCritical" variant="body">
            No products selected
          </Text>
        </Stack>
      </ScrollView>
    );
  }

  return (
    <>
      <ListPopup
        title="Select Transfer Order Location"
        selection={{
          type: 'select',
          items,
          onSelect: async fromLocationId => {
            const fromLocation = locations.find(hasPropertyValue('id', fromLocationId));

            if (!fromLocation) {
              toast.show('Selected item not found');
              return;
            }

            await router.popCurrent();
            router.push('StockTransfer', {
              initial: {
                ...defaultCreateStockTransfer,
                lineItems: fromLocation.stockTransferLineItems,
                fromLocationId,
                toLocationId,
              },
            });
          },
        }}
        emptyState={
          <Stack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
            <Text variant="body" color="TextSubdued">
              Found no locations with inventory available for transfer
            </Text>
          </Stack>
        }
      />
    </>
  );
}

function useTransferOrderLocationItems(products: UnsourcedWorkOrderItem[]) {
  const fetch = useAuthenticatedFetch();
  const productVariantIds = unique(products.map(product => product.productVariantId));
  const productVariantQueries = useProductVariantQueries({ fetch, ids: productVariantIds });
  const locationsQuery = useLocationsQuery({ fetch, params: {} });

  useEffect(() => {
    if (locationsQuery.hasNextPage && !locationsQuery.isFetchingNextPage) {
      locationsQuery.fetchNextPage();
    }
  }, [locationsQuery.hasNextPage, locationsQuery.isFetchingNextPage]);

  const inventoryItemIds = Object.values(productVariantQueries)
    .filter(hasNonNullableProperty('data'))
    .map(query => query.data.inventoryItem.id);

  const { session } = useExtensionApi<'pos.home.modal.render'>();
  const locationIds =
    locationsQuery.data?.pages
      .flat()
      .map(location => location.id)
      .filter(id => id != createGid('Location', session.currentSession.locationId)) ?? [];

  const inventoryItemQueries = useUnbatchedInventoryItemQueries({
    fetch,
    inventoryItems: [...zip(inventoryItemIds, locationIds)].map(([id, locationId]) => ({ id, locationId })),
  });

  const screen = useScreen();
  const allQueries = [
    locationsQuery,
    ...Object.values(productVariantQueries),
    ...Object.values(inventoryItemQueries).flatMap(queries => Object.values(queries)),
  ];

  // TODO: Verify this works with locations query (bcs paginated)
  screen.setIsLoading(allQueries.some(query => query.isLoading));

  const productVariantById = getProductVariantByIdRecord(productVariantQueries);

  const locations = locationIds
    .map(locationId => {
      const availableQuantities = getInventoryItemAvailableQuantitiesForLocation(inventoryItemQueries, locationId);
      const location = locationsQuery.data?.pages.flat().find(hasPropertyValue('id', locationId));
      const availableProducts = getLocationStockTransferLineItems(products, productVariantById, availableQuantities);
      const availableQuantity = sum(availableProducts.map(product => product.quantity));

      return {
        id: locationId,
        name: location?.name ?? 'Unknown location',
        stockTransferLineItems: availableProducts,
        availableQuantity,
      };
    })
    .filter(location => location.availableQuantity > 0)
    .sort((a, b) => b.availableQuantity - a.availableQuantity);

  return {
    locations,
    items: locations.map<ListPopupItem<ID>>(location => ({
      id: location.id,
      leftSide: {
        label: location.name,
        subtitle: [`Can transfer ${location.availableQuantity} products`],
      },
    })),
  };
}

// TODO: Do this on backend !!!!
function getLocationStockTransferLineItems(
  products: UnsourcedWorkOrderItem[],
  productVariantById: Record<ID, ProductVariant>,
  inventoryItemQuantities: Record<ID, number>,
): StockTransferLineItem[] {
  return products
    .map<StockTransferLineItem | null>(({ uuid, productVariantId, unsourcedQuantity, shopifyOrderLineItem }) => {
      const productVariant = productVariantById[productVariantId];
      if (!productVariant) return null;
      const availableQuantity = inventoryItemQuantities[productVariant.inventoryItem.id];
      if (!availableQuantity || availableQuantity <= 0) return null;
      const wantedQuantity = Math.min(availableQuantity, unsourcedQuantity);

      return {
        uuid,
        quantity: wantedQuantity,
        status: 'PENDING',
        inventoryItemId: productVariant.inventoryItem.id,
        shopifyOrderLineItem,
        productTitle: productVariant.product.title,
        productVariantTitle: productVariant.title,
        purchaseOrderLineItem: null,
      };
    })
    .filter(isNonNullable);
}

function getInventoryItemAvailableQuantitiesForLocation(
  inventoryItemIdQueries: ReturnType<typeof useUnbatchedInventoryItemQueries>,
  locationId: ID,
) {
  const availableQuantity: Record<ID, number> = {};

  for (const [inventoryItemId, queryByLocationId] of Object.entries(inventoryItemIdQueries)) {
    const query = queryByLocationId[locationId];

    if (!query?.data) {
      continue;
    }

    availableQuantity[inventoryItemId as ID] =
      query.data.inventoryLevel?.quantities.find(quantity => quantity.name === 'available')?.quantity ?? 0;
  }

  return availableQuantity;
}

function getProductVariantByIdRecord(productVariantQueries: ReturnType<typeof useProductVariantQueries>) {
  const productVariantById: Record<ID, ProductVariant> = {};

  for (const [productVariantId, query] of Object.entries(productVariantQueries)) {
    if (!query.data) {
      continue;
    }

    productVariantById[productVariantId as ID] = query.data;
  }

  return productVariantById;
}
