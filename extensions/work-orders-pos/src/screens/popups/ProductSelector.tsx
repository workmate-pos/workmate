import { List, ListRow, ScrollView, Stack, Text, useExtensionApi } from '@shopify/retail-ui-extensions-react';
import { useDebouncedState } from '@work-orders/common/hooks/use-debounced-state.js';
import { ProductVariant, useProductVariantsQuery } from '@work-orders/common/queries/use-product-variants-query.js';
import { useScreen } from '../../hooks/use-screen.js';
import { useCurrencyFormatter } from '../../hooks/use-currency-formatter.js';
import { useAuthenticatedFetch } from '@work-orders/common-pos/hooks/use-authenticated-fetch.js';
import { uuid } from '../../util/uuid.js';
import { Int } from '@web/schemas/generated/create-work-order.js';
import { useState } from 'react';
import { CreateWorkOrderCharge, CreateWorkOrderLineItem } from '../routes.js';
import { ControlledSearchBar } from '@work-orders/common-pos/components/ControlledSearchBar.js';
import { parseGid } from '@teifi-digital/shopify-app-toolbox/shopify';
import { useServiceCollectionIds } from '../../hooks/use-service-collection-ids.js';
import { productVariantDefaultChargeToCreateWorkOrderCharge } from '../../dto/product-variant-default-charges.js';
import { extractErrorMessage } from '@work-orders/common-pos/util/errors.js';

export function ProductSelector() {
  const [query, setQuery] = useDebouncedState('');
  const [selectedLineItems, setSelectedLineItems] = useState<CreateWorkOrderLineItem[]>([]);
  const [defaultCharges, setDefaultCharges] = useState<CreateWorkOrderCharge[]>([]);

  const { Screen, closePopup } = useScreen('ProductSelector', () => {
    setQuery('', true);
    setSelectedLineItems([]);
    setDefaultCharges([]);
  });

  const { toast } = useExtensionApi<'pos.home.modal.render'>();

  const fetch = useAuthenticatedFetch();
  const serviceCollectionIds = useServiceCollectionIds();
  const productVariantsQuery = useProductVariantsQuery({
    fetch,
    params: {
      query: serviceCollectionIds
        ? `${query} ${serviceCollectionIds.map(id => `NOT collection:${parseGid(id).id}`).join(' ')}`
        : query,
    },
  });

  const productVariants = productVariantsQuery.data?.pages ?? [];
  const currencyFormatter = useCurrencyFormatter();

  const selectLineItem = (
    lineItem: CreateWorkOrderLineItem,
    defaultCharges: CreateWorkOrderCharge[],
    name: string = 'Product',
  ) => {
    setQuery('', true);
    setSelectedLineItems([...selectedLineItems, lineItem]);
    setDefaultCharges(current => [...current, ...defaultCharges]);
    toast.show(`${name} added to cart`, { duration: 1000 });
  };

  const rows = getProductVariantRows(productVariants, selectLineItem, currencyFormatter);

  return (
    <Screen
      title={'Select product'}
      presentation={{ sheet: true }}
      overrideNavigateBack={() => closePopup({ lineItems: selectedLineItems, charges: defaultCharges })}
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
  selectLineItem: (lineItem: CreateWorkOrderLineItem, defaultCharges: CreateWorkOrderCharge[], name?: string) => void,
  currencyFormatter: ReturnType<typeof useCurrencyFormatter>,
): ListRow[] {
  return productVariants.map(variant => {
    let displayName = variant.product.title;

    if (!variant.product.hasOnlyDefaultVariant) {
      displayName = `${displayName} - ${variant.title}`;
    }

    const imageUrl = variant.image?.url ?? variant.product.featuredImage?.url;

    const lineItemUuid = uuid();
    const defaultCharges = variant.defaultCharges.map<CreateWorkOrderCharge>(charge =>
      productVariantDefaultChargeToCreateWorkOrderCharge(charge, lineItemUuid),
    );

    return {
      id: variant.id,
      onPress: () => {
        selectLineItem(
          {
            uuid: lineItemUuid,
            productVariantId: variant.id,
            quantity: 1 as Int,
          },
          defaultCharges,
        );
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
