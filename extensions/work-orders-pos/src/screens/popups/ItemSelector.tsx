import { List, ListRow, ScrollView, SearchBar, Stack, Text } from '@shopify/retail-ui-extensions-react';
import { ClosePopupFn, useScreen } from '../../hooks/use-screen';
import { useDynamicRef } from '../../hooks/use-dynamic-ref';
import { useDebouncedState } from '../../hooks/use-debounced-state';
import { useProductsQuery } from '../../queries/use-products-query';
import { Product } from '@shopify/retail-ui-extensions/src/extension-api/types';
import { useCurrencyFormatter } from '../../hooks/use-currency-formatter';

export function ItemSelector() {
  const { Screen, closePopup } = useScreen('ItemSelector');

  const [query, setQuery] = useDebouncedState('');
  const productsQuery = useProductsQuery({ query });
  const products = productsQuery.data?.pages ?? [];
  const currencyFormatter = useCurrencyFormatter();

  const closeRef = useDynamicRef(() => closePopup, [closePopup]);
  const rows = getProductRows(products, closeRef, currencyFormatter);

  return (
    <Screen title="Select product" presentation={{ sheet: true }} onNavigate={() => setQuery('', true)}>
      <ScrollView>
        <Stack direction="horizontal" alignment="center" flex={1} paddingHorizontal={'HalfPoint'}>
          <Text variant="body" color="TextSubdued">
            {productsQuery.isRefetching ? 'Reloading...' : ' '}
          </Text>
        </Stack>
        <SearchBar onTextChange={query => setQuery(query, !query)} onSearch={() => {}} placeholder="Search products" />
        <List data={rows} onEndReached={() => productsQuery.fetchNextPage()} isLoadingMore={productsQuery.isLoading} />
        {productsQuery.isLoading && (
          <Stack direction="horizontal" alignment="center" flex={1} paddingVertical="ExtraLarge">
            <Text variant="body" color="TextSubdued">
              Loading products...
            </Text>
          </Stack>
        )}
        {productsQuery.isSuccess && rows.length === 0 && (
          <Stack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
            <Text variant="body" color="TextSubdued">
              No products found
            </Text>
          </Stack>
        )}
        {productsQuery.isError && (
          <Stack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
            <Text color="TextCritical" variant="body">
              Error loading products
            </Text>
          </Stack>
        )}
      </ScrollView>
    </Screen>
  );
}

function getProductRows(
  products: Product[],
  closePopupRef: { current: ClosePopupFn<'ItemSelector'> },
  currencyFormatter: ReturnType<typeof useCurrencyFormatter>,
): ListRow[] {
  return products.flatMap(product =>
    product.variants.map(variant => ({
      id: String(variant.id),
      onPress: () => {
        closePopupRef.current({
          productVariantId: String(variant.id),
          name: variant.displayName,
          sku: variant.sku ?? '',
          quantity: 1,
          unitPrice: Number(variant.price),
          imageUrl: variant.image ?? product.featuredImage,
        });
      },
      leftSide: {
        label: variant.displayName,
        subtitle: [product.description],
        image: { source: variant.image ?? product.featuredImage },
      },
      rightSide: {
        showChevron: true,
        label: currencyFormatter(Number(variant.price)),
      },
    })),
  );
}
