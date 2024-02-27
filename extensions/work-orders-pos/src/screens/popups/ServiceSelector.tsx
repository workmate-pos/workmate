import { List, ListRow, ScrollView, Stack, Text } from '@shopify/retail-ui-extensions-react';
import { ProductVariant, useProductVariantsQuery } from '@work-orders/common/queries/use-product-variants-query.js';
import { useDebouncedState } from '@work-orders/common/hooks/use-debounced-state.js';
import { ClosePopupFn, useScreen } from '../../hooks/use-screen.js';
import { useCurrencyFormatter } from '../../hooks/use-currency-formatter.js';
import { uuid } from '../../util/uuid.js';
import { useAuthenticatedFetch } from '@work-orders/common-pos/hooks/use-authenticated-fetch.js';
import { Int } from '@web/schemas/generated/create-work-order.js';
import { ControlledSearchBar } from '@work-orders/common-pos/components/ControlledSearchBar.js';
import { parseGid } from '@teifi-digital/shopify-app-toolbox/shopify';
import { useServiceCollectionIds } from '../../hooks/use-service-collection-ids.js';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { CreateWorkOrderCharge } from '../routes.js';
import { productVariantDefaultChargeToCreateWorkOrderCharge } from '../../dto/product-variant-default-charges.js';
import { extractErrorMessage } from '@work-orders/common-pos/util/errors.js';
import { isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { useDynamicRef } from '@work-orders/common-pos/hooks/use-dynamic-ref.js';
import { getChargesPrice } from '../../create-work-order/charges.js';

export function ServiceSelector() {
  const [query, setQuery] = useDebouncedState('');
  const { Screen, closePopup } = useScreen('ServiceSelector', () => {
    setQuery('', true);
  });

  const fetch = useAuthenticatedFetch();
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
  const rows = getProductVariantRows(productVariantsQuery?.data?.pages.flat() ?? [], closeRef, currencyFormatter);

  return (
    <Screen title={'Select service'} presentation={{ sheet: true }}>
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
        <List data={rows} imageDisplayStrategy={'always'} />
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
              {extractErrorMessage(productVariantsQuery.error, 'Error loading services')}
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
  return productVariants
    .map<ListRow | null>(variant => {
      const displayName = getProductVariantName(variant) ?? 'Unknown service';

      const imageUrl = variant.image?.url ?? variant.product.featuredImage?.url;

      const type = variant.product.isFixedServiceItem
        ? 'fixed-service'
        : variant.product.isMutableServiceItem
          ? 'mutable-service'
          : null;

      if (type === null) {
        return null;
      }

      const defaultCharges = variant.defaultCharges.map<CreateWorkOrderCharge>(charge =>
        productVariantDefaultChargeToCreateWorkOrderCharge(charge, 'placeholder'),
      );

      let label: string | undefined = undefined;

      if (variant.product.isMutableServiceItem) {
        if (defaultCharges) {
          label = currencyFormatter(getChargesPrice(defaultCharges));
        }
      } else {
        label = currencyFormatter(variant.price);
      }

      return {
        id: variant.id,
        onPress: () => {
          const lineItemUuid = uuid();

          closePopupRef.current({
            type,
            lineItem: {
              uuid: lineItemUuid,
              productVariantId: variant.id,
              quantity: 1 as Int,
            },
            charges: defaultCharges.map(charge => ({ ...charge, lineItemUuid })),
          });
        },
        leftSide: {
          label: displayName,
          subtitle: variant.product.description ? [variant.product.description] : undefined,
          image: { source: imageUrl },
        },
        rightSide: {
          showChevron: true,
          label,
        },
      };
    })
    .filter(isNonNullable);
}
