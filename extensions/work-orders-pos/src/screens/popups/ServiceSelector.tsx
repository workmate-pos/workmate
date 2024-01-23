import { List, ListRow, ScrollView, Stack, Text } from '@shopify/retail-ui-extensions-react';
import { ProductVariant, useProductVariantsQuery } from '@work-orders/common/queries/use-product-variants-query.js';
import { useDebouncedState } from '@work-orders/common/hooks/use-debounced-state.js';
import { useSettingsQuery } from '@work-orders/common/queries/use-settings-query.js';
import { ClosePopupFn, useScreen } from '../../hooks/use-screen.js';
import { useDynamicRef } from '../../hooks/use-dynamic-ref.js';
import { useCurrencyFormatter } from '../../hooks/use-currency-formatter.js';
import { uuid } from '../../util/uuid.js';
import { useAuthenticatedFetch } from '../../hooks/use-authenticated-fetch.js';
import { Int } from '@web/schemas/generated/create-work-order.js';
import { ControlledSearchBar } from '../../components/ControlledSearchBar.js';
import { parseGid } from '@teifi-digital/shopify-app-toolbox/shopify';
import { useServiceCollectionIds } from '../../hooks/use-service-collection-ids.js';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';

export function ServiceSelector() {
  const [query, setQuery] = useDebouncedState('');
  const { Screen, closePopup } = useScreen('ServiceSelector', () => {
    setQuery('', true);
  });

  const fetch = useAuthenticatedFetch();
  const settingsQuery = useSettingsQuery({ fetch });
  const serviceCollectionIds = useServiceCollectionIds();
  const productVariantsQuery = useProductVariantsQuery({
    fetch,
    params: {
      query: serviceCollectionIds
        ? `${query} AND (${serviceCollectionIds.map(id => `collection:${parseGid(id).id}`).join(' OR ')})`
        : query,
    },
  });
  const currencyFormatter = useCurrencyFormatter();

  const closeRef = useDynamicRef(() => closePopup, [closePopup]);
  const rows = getProductVariantRows(productVariantsQuery?.data?.pages ?? [], closeRef, currencyFormatter);

  return (
    <Screen title={'Select service'} isLoading={settingsQuery.isLoading} presentation={{ sheet: true }}>
      <ScrollView>
        <Stack direction="horizontal" alignment="center" flex={1} paddingHorizontal={'HalfPoint'}>
          <Text variant="body" color="TextSubdued">
            {productVariantsQuery.isRefetching ? 'Reloading...' : ' '}
          </Text>
        </Stack>
        <ControlledSearchBar
          value={query}
          onTextChange={(query: string) => setQuery(query)}
          onSearch={() => {}}
          placeholder={'Search services'}
        />
        <List data={rows} />
        {productVariantsQuery.isLoading && (
          <Stack direction="horizontal" alignment="center" flex={1} paddingVertical="ExtraLarge">
            <Text variant="body" color="TextSubdued">
              Loading services...
            </Text>
          </Stack>
        )}
        {productVariantsQuery.isSuccess && rows.length === 0 && (
          <Stack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
            <Text variant="body" color="TextSubdued">
              No services found
            </Text>
          </Stack>
        )}
        {productVariantsQuery.isError && (
          <Stack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
            <Text color="TextCritical" variant="body">
              Error loading services
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
  return productVariants.flatMap(variant => {
    const displayName = getProductVariantName(variant) ?? 'Unknown service';

    const imageUrl = variant.image?.url ?? variant.product.featuredImage?.url;

    const type = variant.product.isFixedServiceItem
      ? 'fixed-service'
      : variant.product.isMutableServiceItem
        ? 'mutable-service'
        : null;

    if (type === null) {
      return [];
    }

    return {
      id: variant.id,
      onPress: () => {
        closePopupRef.current({
          type,
          lineItem: {
            uuid: uuid(),
            productVariantId: variant.id,
            quantity: 1 as Int,
          },
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
