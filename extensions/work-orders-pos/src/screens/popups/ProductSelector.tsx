import { List, ListRow, ScrollView, SearchBar, Stack, Text } from '@shopify/retail-ui-extensions-react';
import { useDebouncedState } from '@work-orders/common/hooks/use-debounced-state.js';
import { ProductVariant, useProductVariantsQuery } from '@work-orders/common/queries/use-product-variants-query.js';
import { useSettingsQuery } from '@work-orders/common/queries/use-settings-query.js';
import { ClosePopupFn, useScreen } from '../../hooks/use-screen.js';
import { useDynamicRef } from '../../hooks/use-dynamic-ref.js';
import { useCurrencyFormatter } from '../../hooks/use-currency-formatter.js';
import { useAuthenticatedFetch } from '../../hooks/use-authenticated-fetch.js';
import { uuid } from '../../util/uuid.js';
import { Int } from '@web/schemas/generated/create-work-order.js';
import { parseGid } from '@work-orders/common/util/gid.js';

export function ProductSelector() {
  const [query, setQuery] = useDebouncedState('');
  const { Screen, closePopup } = useScreen('ProductSelector', () => {
    setQuery('', true);
  });

  const fetch = useAuthenticatedFetch();
  const settingsQuery = useSettingsQuery({ fetch });
  const serviceCollectionId = settingsQuery.data?.settings.serviceCollectionId
    ? parseGid(settingsQuery.data?.settings.serviceCollectionId).id
    : null;
  const productVariantsQuery = useProductVariantsQuery({
    fetch,
    params: { query: serviceCollectionId ? `${query} NOT collection:${serviceCollectionId}` : query },
  });
  const productVariants = productVariantsQuery.data?.pages ?? [];
  const currencyFormatter = useCurrencyFormatter();

  const closeRef = useDynamicRef(() => closePopup, [closePopup]);
  const rows = getProductVariantRows(productVariants, closeRef, currencyFormatter);

  return (
    <Screen title={'Select product'} isLoading={settingsQuery.isLoading} presentation={{ sheet: true }}>
      <ScrollView>
        <Stack direction="horizontal" alignment="center" flex={1} paddingHorizontal={'HalfPoint'}>
          <Text variant="body" color="TextSubdued">
            {productVariantsQuery.isRefetching ? 'Reloading...' : ' '}
          </Text>
        </Stack>
        <SearchBar
          initialValue={query}
          onTextChange={(query: string) => setQuery(query, !query)}
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
          uuid: uuid(),
          productVariantId: variant.id,
          quantity: 1 as Int,
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
