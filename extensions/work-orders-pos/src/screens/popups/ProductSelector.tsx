import { List, ListRow, ScrollView, SearchBar, Stack, Text } from '@shopify/retail-ui-extensions-react';
import { ClosePopupFn, useScreen } from '../../hooks/use-screen.js';
import { useDynamicRef } from '../../hooks/use-dynamic-ref.js';
import { useDebouncedState } from '@common/hooks/use-debounced-state';
import { ProductVariant, useProductVariantsQuery } from '@common/queries/use-product-variants-query';
import { useCurrencyFormatter } from '../../hooks/use-currency-formatter.js';
import { useSettingsQuery } from '@common/queries/use-settings-query';
import { useAuthenticatedFetch } from '../../hooks/use-authenticated-fetch';

export function ProductSelector() {
  const { Screen, closePopup } = useScreen('ProductSelector');

  const fetch = useAuthenticatedFetch();
  const [query, setQuery] = useDebouncedState('');
  const productVariantsQuery = useProductVariantsQuery({ fetch, params: { query } });
  const productVariants = productVariantsQuery.data?.pages ?? [];
  const currencyFormatter = useCurrencyFormatter();
  const settingsQuery = useSettingsQuery({ fetch });

  const filteredProductVariants = productVariants.filter(variant =>
    variant.product.collections.nodes.every(c => c.id !== settingsQuery.data?.settings.serviceCollectionId),
  );

  const closeRef = useDynamicRef(() => closePopup, [closePopup]);
  const rows = getProductVariantRows(filteredProductVariants, closeRef, currencyFormatter);

  return (
    <Screen
      title={'Select product'}
      isLoading={settingsQuery.isLoading}
      presentation={{ sheet: true }}
      onNavigate={() => setQuery('', true)}
    >
      <ScrollView>
        <Stack direction="horizontal" alignment="center" flex={1} paddingHorizontal={'HalfPoint'}>
          <Text variant="body" color="TextSubdued">
            {productVariantsQuery.isRefetching ? 'Reloading...' : ' '}
          </Text>
        </Stack>
        <SearchBar
          onTextChange={query => setQuery(query, !query)}
          onSearch={() => {}}
          placeholder={'Search products'}
        />
        <List
          data={rows}
          onEndReached={() => productVariantsQuery.fetchNextPage()}
          isLoadingMore={productVariantsQuery.isLoading}
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
              Error loading products
            </Text>
          </Stack>
        )}
      </ScrollView>
    </Screen>
  );
}

function getProductVariantRows(
  productVariants: ProductVariant[],
  closePopupRef: { current: ClosePopupFn<'ProductSelector'> },
  currencyFormatter: ReturnType<typeof useCurrencyFormatter>,
): ListRow[] {
  return productVariants.map(variant => {
    let displayName = variant.product.title;

    if (!variant.product.hasOnlyDefaultVariant) {
      displayName = `${displayName} - ${variant.title}`;
    }

    const imageUrl = variant.image?.url ?? variant.product.featuredImage?.url;

    return {
      id: variant.id,
      onPress: () => {
        closePopupRef.current({
          productVariantId: String(variant.id),
          name: displayName,
          sku: variant.sku ?? '',
          quantity: 1,
          unitPrice: Number(variant.price),
          imageUrl,
        });
      },
      leftSide: {
        label: displayName,
        subtitle: variant.product.description ? [variant.product.description] : undefined,
        image: { source: imageUrl ?? 'not found' },
      },
      rightSide: {
        showChevron: true,
        label: currencyFormatter(Number(variant.price)),
      },
    };
  });
}
