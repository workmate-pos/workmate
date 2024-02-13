import { useState } from 'react';
import { useScreen } from '@work-orders/common-pos/hooks/use-screen.js';
import { useDebouncedState } from '@work-orders/common/hooks/use-debounced-state.js';
import { Int, Product } from '@web/schemas/generated/create-purchase-order.js';
import { List, ListRow, ScrollView, Stack, Text, useExtensionApi } from '@shopify/retail-ui-extensions-react';
import { useAuthenticatedFetch } from '@work-orders/common-pos/hooks/use-authenticated-fetch.js';
import { ProductVariant, useProductVariantsQuery } from '@work-orders/common/queries/use-product-variants-query.js';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { extractErrorMessage } from '@work-orders/common-pos/util/errors.js';
import { ControlledSearchBar } from '@work-orders/common-pos/components/ControlledSearchBar.js';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { useInventoryItemQueries } from '@work-orders/common/queries/use-inventory-item-query.js';

export function ProductSelector() {
  const [query, setQuery] = useDebouncedState('');
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);

  // optional fields, used to filter products by vendor, and show stock for a location
  const [vendorName, setVendorName] = useState<string | null>(null);
  const [locationName, setLocationName] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<ID | null>(null);

  const { Screen, closePopup } = useScreen('ProductSelector', ({ vendorName, locationName, locationId }) => {
    setQuery('', true);
    setSelectedProducts([]);
    setVendorName(vendorName);
    setLocationName(locationName);
    setLocationId(locationId);
  });

  const { toast } = useExtensionApi<'pos.home.modal.render'>();

  const fetch = useAuthenticatedFetch();

  const vendorQuery = vendorName ? `vendor:"${vendorName}"` : '';
  const productVariantsQuery = useProductVariantsQuery({
    fetch,
    params: {
      query: `${query} ${vendorQuery}`,
    },
  });
  const productVariants = productVariantsQuery.data?.pages ?? [];

  const selectProduct = (product: Product, name: string = 'Product') => {
    setQuery('', true);
    setSelectedProducts(products => [...products, product]);
    toast.show(`${name} added to purchase order`, { duration: 1000 });
  };

  const rows = useProductVariantRows(productVariants, locationId, selectProduct);

  return (
    <Screen
      title="Select Product"
      presentation={{ sheet: true }}
      overrideNavigateBack={() => closePopup(selectedProducts)}
    >
      <ScrollView>
        {vendorName && (
          <Stack direction={'horizontal'} paddingVertical={'Medium'} alignment={'center'}>
            <Text variant="captionMedium" color="TextSubdued">
              Showing products for vendor {vendorName}, and stock for location {locationName}
            </Text>
          </Stack>
        )}

        <Stack direction="horizontal" alignment="center" flex={1} paddingHorizontal={'HalfPoint'}>
          <Text variant="body" color="TextSubdued">
            {productVariantsQuery.isRefetching ? 'Reloading...' : ' '}
          </Text>
        </Stack>
        <ControlledSearchBar
          value={query}
          onTextChange={(query: string) => setQuery(query, !query)}
          onSearch={() => {}}
          placeholder={'Search products'}
        />
        <List
          data={rows}
          onEndReached={productVariantsQuery.fetchNextPage}
          isLoadingMore={productVariantsQuery.isLoading}
          imageDisplayStrategy={'always'}
        />
        {productVariantsQuery.isLoading && (
          <Stack direction="horizontal" alignment="center" flex={1} paddingVertical="ExtraLarge">
            <Text variant="body" color="TextSubdued">
              Loading products...
            </Text>
          </Stack>
        )}
        {productVariantsQuery.isSuccess && rows.length === 0 && (
          <Stack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
            <Text variant="body" color="TextSubdued">
              No products found
            </Text>
          </Stack>
        )}
        {productVariantsQuery.isError && (
          <Stack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
            <Text color="TextCritical" variant="body">
              {extractErrorMessage(productVariantsQuery.error, 'Error loading products')}
            </Text>
          </Stack>
        )}
      </ScrollView>
    </Screen>
  );
}

function useProductVariantRows(
  productVariants: ProductVariant[],
  locationId: ID | null,
  selectProduct: (product: Product, name?: string) => void,
) {
  const fetch = useAuthenticatedFetch();

  const inventoryItemIds = productVariants.map(variant => variant.inventoryItem.id);
  const inventoryItemQueries = useInventoryItemQueries({ fetch, ids: inventoryItemIds });

  return productVariants.map<ListRow>(variant => {
    const displayName = getProductVariantName(variant) ?? 'Unknown Product';
    const imageUrl = variant.image?.url ?? variant.product?.featuredImage?.url;

    const inventoryItemId = variant.inventoryItem.id;
    const inventoryItem = inventoryItemQueries[inventoryItemId]?.data;
    const availableQuantity = inventoryItem?.inventoryLevels?.nodes
      ?.find(level => level.location.id === locationId)
      ?.quantities?.find(quantity => quantity.name === 'available')?.quantity;

    return {
      id: variant.id,
      onPress: () =>
        selectProduct({
          productVariantId: variant.id,
          quantity: 1 as Int,
          name: displayName,
          sku: variant.sku,
          handle: variant.product.handle,
        }),
      leftSide: {
        label: displayName,
        image: {
          source: imageUrl,
          badge: availableQuantity,
        },
      },
      rightSide: { showChevron: true },
    };
  });
}
