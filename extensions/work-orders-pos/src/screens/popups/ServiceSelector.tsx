import { List, ListRow, ScrollView, SearchBar, Stack, Text } from '@shopify/retail-ui-extensions-react';
import { ClosePopupFn, useScreen } from '../../hooks/use-screen.js';
import { useDynamicRef } from '../../hooks/use-dynamic-ref.js';
import { ProductVariant } from '@common/queries/use-product-variants-query';
import { useCurrencyFormatter } from '../../hooks/use-currency-formatter.js';
import { useSettingsQuery } from '@common/queries/use-settings-query';
import { uuid } from '../../util/uuid';
import { useServiceProductVariants } from '@common/queries/use-service-product-variants-query';
import { useState } from 'react';
import { useAuthenticatedFetch } from '../../hooks/use-authenticated-fetch';

// TODO: DRY with ProductSelector

export function ServiceSelector() {
  const { Screen, closePopup } = useScreen('ServiceSelector');

  const [query, setQuery] = useState('');
  const fetch = useAuthenticatedFetch();
  const productVariantsQuery = useServiceProductVariants({ fetch });
  const settingsQuery = useSettingsQuery({ fetch });
  const currencyFormatter = useCurrencyFormatter();

  const filteredProductVariants =
    productVariantsQuery.data?.pages?.filter(
      variant =>
        (!query ||
          variant.title.toLowerCase().includes(query.toLowerCase()) ||
          variant.product.title.toLowerCase().includes(query.toLowerCase())) &&
        variant.product.collections.nodes.some(c => c.id === settingsQuery.data?.settings.serviceCollectionId),
    ) ?? [];

  const closeRef = useDynamicRef(() => closePopup, [closePopup]);
  const rows = getProductVariantRows(filteredProductVariants, closeRef, currencyFormatter);

  return (
    <Screen
      title={'Select service'}
      isLoading={settingsQuery.isLoading}
      presentation={{ sheet: true }}
      onNavigate={() => setQuery('')}
    >
      <ScrollView>
        <Stack direction="horizontal" alignment="center" flex={1} paddingHorizontal={'HalfPoint'}>
          <Text variant="body" color="TextSubdued">
            {productVariantsQuery.isRefetching ? 'Reloading...' : ' '}
          </Text>
        </Stack>
        <SearchBar onTextChange={query => setQuery(query)} onSearch={() => {}} placeholder={'Search services'} />
        <List data={rows} />
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
  closePopupRef: { current: ClosePopupFn<'ServiceSelector'> },
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
          // TODO: allow setting this right when selecting the service instead of only through the edit menu (immediately redirect after popup close)
          employeeAssignments: [],
          productVariantId: String(variant.id),
          name: displayName,
          sku: variant.sku ?? '',
          basePrice: Number(variant.price),
          imageUrl,
          uuid: uuid(),
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
