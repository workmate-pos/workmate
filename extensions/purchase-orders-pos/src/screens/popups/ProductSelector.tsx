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

export function ProductSelector() {
  const [query, setQuery] = useDebouncedState('');
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);

  const { Screen, closePopup } = useScreen('ProductSelector', () => {
    setQuery('', true);
    setSelectedProducts([]);
  });

  const { toast } = useExtensionApi<'pos.home.modal.render'>();

  const fetch = useAuthenticatedFetch();

  // TODO: Only fetch products for the current vendor (if set via eg metafield)
  const productVariantsQuery = useProductVariantsQuery({ fetch, params: { query } });
  const productVariants = productVariantsQuery.data?.pages ?? [];

  const selectProduct = (product: Product, name: string = 'Product') => {
    setQuery('', true);
    setSelectedProducts(products => [...products, product]);
    toast.show(`${name} added to purchase order`, { duration: 1000 });
  };

  const rows = getProductVariantRows(productVariants, selectProduct);

  return (
    <Screen
      title="Select Product"
      presentation={{ sheet: true }}
      overrideNavigateBack={() => closePopup(selectedProducts)}
    >
      <ScrollView>
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

function getProductVariantRows(
  productVariants: ProductVariant[],
  selectProduct: (product: Product, name?: string) => void,
) {
  return productVariants.map<ListRow>(variant => {
    const displayName = getProductVariantName(variant) ?? 'Unknown Product';
    const imageUrl = variant.image?.url ?? variant.product?.featuredImage?.url;

    return {
      id: variant.id,
      onPress: () =>
        selectProduct({
          productVariantId: variant.id,
          quantity: 1 as Int,
        }),
      leftSide: {
        label: displayName,
        image: {
          source: imageUrl ?? 'not found',
        },
      },
      rightSide: { showChevron: true },
    };
  });
}
