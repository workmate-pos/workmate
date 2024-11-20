import { StockTransferLineItem } from '@web/schemas/generated/create-stock-transfer.js';
import { useEffect } from 'react';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { Fetch } from './fetch.js';
import { useProductVariantQueries } from './use-product-variant-query.js';
import { useLocationsQuery } from './use-locations-query.js';
import { hasNonNullableProperty, hasPropertyValue, isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { useUnbatchedInventoryItemQueries } from './use-inventory-item-query.js';
import { zip } from '@teifi-digital/shopify-app-toolbox/iteration';
import { sum, unique } from '@teifi-digital/shopify-app-toolbox/array';
import { ProductVariant } from './use-product-variants-query.js';
import { uuid } from '../util/uuid.js';

export type StockTransferLocationItem = ReturnType<typeof useTransferOrderLocationItems>['locations'][number];

// TODO: Eventually do this with Direct API Access
export function useTransferOrderLocationItems(
  fetch: Fetch,
  toLocationId: ID,
  items: { productVariantId: ID; quantity: number; shopifyOrderLineItem: { id: ID; orderId: ID } }[],
) {
  const productVariantIds = unique(items.map(item => item.productVariantId));

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

  const locationIds =
    locationsQuery.data?.pages
      .flat()
      .map(location => location.id)
      .filter(id => id !== toLocationId) ?? [];

  const inventoryItemQueries = useUnbatchedInventoryItemQueries({
    fetch,
    inventoryItems: [...zip(inventoryItemIds, locationIds)].map(([id, locationId]) => ({ id, locationId })),
  });

  const allQueries = [
    locationsQuery,
    ...Object.values(productVariantQueries),
    ...Object.values(inventoryItemQueries).flatMap(queries => Object.values(queries)),
  ];

  const isLoading = allQueries.some(query => query.isLoading);

  const productVariantById = getProductVariantByIdRecord(productVariantQueries);

  const locations = locationIds
    .map(locationId => {
      const availableQuantities = getInventoryItemAvailableQuantitiesForLocation(inventoryItemQueries, locationId);
      const location = locationsQuery.data?.pages.flat().find(hasPropertyValue('id', locationId));
      const availableProducts = getLocationStockTransferLineItems(items, productVariantById, availableQuantities);
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
    isLoading,
    locations,
  };
}

// TODO: Do this on backend !!!!
function getLocationStockTransferLineItems(
  items: { productVariantId: ID; quantity: number; shopifyOrderLineItem: { id: ID; orderId: ID } }[],
  productVariantById: Record<ID, ProductVariant>,
  inventoryItemQuantities: Record<ID, number>,
): StockTransferLineItem[] {
  return items
    .map<StockTransferLineItem | null>(({ productVariantId, quantity, shopifyOrderLineItem }) => {
      const productVariant = productVariantById[productVariantId];
      if (!productVariant) return null;
      const availableQuantity = inventoryItemQuantities[productVariant.inventoryItem.id];
      if (!availableQuantity || availableQuantity <= 0) return null;
      const wantedQuantity = Math.min(availableQuantity, quantity);

      return {
        uuid: uuid(),
        quantity: wantedQuantity,
        status: 'PENDING',
        inventoryItemId: productVariant.inventoryItem.id,
        productTitle: productVariant.product.title,
        productVariantTitle: productVariant.title,
        purchaseOrderLineItem: null,
        shopifyOrderLineItem,
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
