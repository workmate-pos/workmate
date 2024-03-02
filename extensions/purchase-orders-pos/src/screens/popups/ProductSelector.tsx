import { useDebouncedState } from '@work-orders/common/hooks/use-debounced-state.js';
import { type CreatePurchaseOrder, Int, Product } from '@web/schemas/generated/create-purchase-order.js';
import { Button, List, ListRow, ScrollView, Stack, Text, useExtensionApi } from '@shopify/retail-ui-extensions-react';
import { ProductVariant, useProductVariantsQuery } from '@work-orders/common/queries/use-product-variants-query.js';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { ID, parseGid } from '@teifi-digital/shopify-app-toolbox/shopify';
import { useInventoryItemQueries } from '@work-orders/common/queries/use-inventory-item-query.js';
import { NonNullableValues } from '../../types.js';
import { useRouter } from '../../routes.js';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { ControlledSearchBar } from '@teifi-digital/pos-tools/components/ControlledSearchBar.js';
import { extractErrorMessage } from '@teifi-digital/pos-tools/utils/errors.js';

export function ProductSelector({
  filters: { vendorName, locationName, locationId },
  onSelect,
}: {
  filters: NonNullableValues<Pick<CreatePurchaseOrder, 'vendorName' | 'locationName' | 'locationId'>>;
  onSelect: (product: Product) => void;
}) {
  const [query, setQuery] = useDebouncedState('');

  const { toast } = useExtensionApi<'pos.home.modal.render'>();

  const fetch = useAuthenticatedFetch();

  const vendorQuery = vendorName ? `vendor:"${vendorName}"` : '';
  const locationIdQuery = locationId ? `location_id:${parseGid(locationId).id}` : '';
  const productVariantsQuery = useProductVariantsQuery({
    fetch,
    params: {
      query: [query, vendorQuery, locationIdQuery].filter(Boolean).join(' AND '),
    },
  });
  const productVariants = productVariantsQuery.data?.pages ?? [];

  const selectProduct = (product: Product) => {
    setQuery('', true);
    onSelect(product);
    toast.show('Product added to purchase order', { duration: 1000 });
  };

  const rows = useProductVariantRows(productVariants.flat(), locationId, selectProduct);

  const router = useRouter();

  return (
    <ScrollView>
      <Stack direction={'horizontal'} paddingVertical={'Medium'} alignment={'center'}>
        <Text variant="captionMedium" color="TextSubdued">
          Showing products for vendor {vendorName}, and stock for location {locationName}
        </Text>
      </Stack>

      <Button
        title={'New Product'}
        variant={'primary'}
        onPress={() => {
          if (!locationId) {
            toast.show('Location id not set');
            return;
          }

          if (!vendorName) {
            toast.show('Vendor name not set');
            return;
          }

          router.push('ProductCreator', {
            initialProduct: {
              locationId,
              vendorName,
            },
            onCreate: (product: Product) => {
              selectProduct(product);
            },
          });
        }}
      />

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
  );
}

function useProductVariantRows(
  productVariants: ProductVariant[],
  locationId: ID | null,
  selectProduct: (product: Product) => void,
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
          inventoryItemId: variant.inventoryItem.id,
          handle: variant.product.handle,
          productVariantId: variant.id,
          availableQuantity: 0 as Int,
          quantity: 1 as Int,
          name: displayName,
          sku: variant.sku,
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
