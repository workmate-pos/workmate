import { Button, List, ListRow, ScrollView, Stack, Text, useApi } from '@shopify/ui-extensions-react/point-of-sale';
import { ProductVariant, useProductVariantsQuery } from '@work-orders/common/queries/use-product-variants-query.js';
import { uuid } from '@work-orders/common/util/uuid.js';
import { CreateWorkOrder, Int } from '@web/schemas/generated/create-work-order.js';
import { CreateWorkOrderCharge, CreateWorkOrderItem } from '../../types.js';
import { productVariantDefaultChargeToCreateWorkOrderCharge } from '@work-orders/common/create-work-order/product-variant-default-charges.js';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { useCurrencyFormatter } from '@work-orders/common-pos/hooks/use-currency-formatter.js';
import { ControlledSearchBar } from '@teifi-digital/pos-tools/components/ControlledSearchBar.js';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { useRouter } from '../../routes.js';
import { useDebouncedState } from '@work-orders/common-pos/hooks/use-debounced-state.js';
import { BigDecimal } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { Dispatch, SetStateAction, useState } from 'react';
import { PaginationControls } from '@work-orders/common-pos/components/PaginationControls.js';
import { SERVICE_METAFIELD_VALUE_TAG_NAME } from '@work-orders/common/metafields/product-service-type.js';
import { escapeQuotationMarks } from '@work-orders/common/util/escape.js';
import { useCustomFieldsPresetsQuery } from '@work-orders/common/queries/use-custom-fields-presets-query.js';
import { useScreen } from '@teifi-digital/pos-tools/router';
import { getTotalPriceForCharges } from '@work-orders/common/create-work-order/charges.js';
import { ResponsiveStack } from '@teifi-digital/pos-tools/components/ResponsiveStack.js';
import { ResponsiveGrid } from '@teifi-digital/pos-tools/components/ResponsiveGrid.js';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { useUnbatchedInventoryItemQueries } from '@work-orders/common/queries/use-inventory-item-query.js';
import { useLocationQueries } from '@work-orders/common/queries/use-location-query.js';
import { hasPropertyValue } from '@teifi-digital/shopify-app-toolbox/guards';
import { match, P } from 'ts-pattern';
import { identity } from '@teifi-digital/shopify-app-toolbox/functional';

export function ProductSelector({
  onSelect,
  companyLocationId,
  inventoryLocationIds: initialInventoryLocationIds,
  onInventoryLocationIdsChange,
}: {
  onSelect: (arg: { items: CreateWorkOrderItem[]; charges: CreateWorkOrderCharge[] }) => void;
  companyLocationId: ID | null;
  inventoryLocationIds: ID[];
  onInventoryLocationIdsChange: Dispatch<SetStateAction<ID[]>>;
}) {
  const { toast } = useApi<'pos.home.modal.render'>();

  const [query, setQuery] = useDebouncedState('');
  const [inventoryLocationIds, _setInventoryLocationIds] = useState<ID[]>(initialInventoryLocationIds);
  const setInventoryLocationIds: Dispatch<SetStateAction<ID[]>> = arg => {
    onInventoryLocationIdsChange(arg);
    _setInventoryLocationIds(arg);
  };

  const fetch = useAuthenticatedFetch();
  const productVariantsQuery = useProductVariantsQuery({
    fetch,
    params: {
      first: 50 as Int,
      query: [
        query,
        'product_status:active',
        ...Object.values(SERVICE_METAFIELD_VALUE_TAG_NAME).map(tag => `tag_not:"${escapeQuotationMarks(tag)}"`),
      ]
        .filter(Boolean)
        .map(q => `(${q})`)
        .join(' AND '),
    },
  });

  const customFieldsPresetsQuery = useCustomFieldsPresetsQuery({ fetch, type: 'LINE_ITEM' });

  const screen = useScreen();

  const isLoading = customFieldsPresetsQuery.isLoading;
  screen.setIsLoading(isLoading);

  const currencyFormatter = useCurrencyFormatter();

  const internalOnSelect = (
    items: CreateWorkOrderItem[],
    charges: CreateWorkOrderCharge[],
    name: string = 'Product',
  ) => {
    onSelect({ items, charges });
    toast.show(`${name} added to cart`, { duration: 750 });
  };

  const router = useRouter();

  const [page, setPage] = useState(1);
  const pagination = (
    <PaginationControls
      page={page}
      pageCount={productVariantsQuery.data?.pages?.length ?? 0}
      onPageChange={setPage}
      hasNextPage={productVariantsQuery.hasNextPage ?? false}
      isLoadingNextPage={productVariantsQuery.isFetchingNextPage}
      onFetchNextPage={productVariantsQuery.fetchNextPage}
    />
  );

  const shouldShowPrice = companyLocationId === null;

  const rows = useProductVariantRows(
    productVariantsQuery.data?.pages?.[page - 1] ?? [],
    internalOnSelect,
    currencyFormatter,
    inventoryLocationIds,
    shouldShowPrice,
  );

  if (isLoading) {
    return null;
  }

  if (customFieldsPresetsQuery.isError || !customFieldsPresetsQuery.data) {
    return (
      <ResponsiveStack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
        <Text color="TextCritical" variant="body">
          {extractErrorMessage(
            customFieldsPresetsQuery.error,
            'An error occurred while loading default custom field presets',
          )}
        </Text>
      </ResponsiveStack>
    );
  }

  return (
    <ScrollView>
      <ResponsiveGrid columns={3}>
        <Button
          title={'New product'}
          type={'primary'}
          onPress={() =>
            router.push('ProductCreator', {
              initialProduct: {},
              onCreate: product =>
                internalOnSelect(
                  [
                    {
                      type: 'product',
                      quantity: product.quantity,
                      uuid: uuid(),
                      productVariantId: product.productVariantId,
                      absorbCharges: false,
                      customFields: customFieldsPresetsQuery.data.defaultCustomFields,
                    },
                  ],
                  [],
                ),
            })
          }
        />
        <Button
          title={'Custom product'}
          type={'primary'}
          onPress={async () => {
            await router.popCurrent();
            internalOnSelect(
              [
                {
                  type: 'custom-item',
                  quantity: 1 as Int,
                  absorbCharges: false,
                  customFields: customFieldsPresetsQuery.data.defaultCustomFields,
                  uuid: uuid(),
                  name: 'Unnamed product',
                  unitPrice: BigDecimal.ONE.toMoney(),
                },
              ],
              [],
            );
          }}
        />
        <ResponsiveGrid columns={1} spacing={2}>
          <Button
            title={'Select locations'}
            onPress={() =>
              router.push('MultiLocationSelector', {
                initialSelection: inventoryLocationIds,
                onSelect: locations => setInventoryLocationIds(locations.map(location => location.id)),
              })
            }
          />
          {inventoryLocationIds.length > 3 && (
            <Text variant={'body'} color={'TextWarning'}>
              At most 3 locations can be shown, but you have selected {inventoryLocationIds.length}.
            </Text>
          )}
        </ResponsiveGrid>
      </ResponsiveGrid>

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
      {pagination}
      <List data={rows} imageDisplayStrategy={'always'} />
      {productVariantsQuery.isFetching && (
        <Stack direction="horizontal" alignment="center" flex={1} paddingVertical="ExtraLarge">
          <Text variant="body" color="TextSubdued">
            Loading products...
          </Text>
        </Stack>
      )}
      {!productVariantsQuery.isFetching && productVariantsQuery.isSuccess && rows.length === 0 && (
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
      {pagination}
    </ScrollView>
  );
}

function useProductVariantRows(
  productVariants: ProductVariant[],
  onSelect: (lineItems: CreateWorkOrderItem[], defaultCharges: CreateWorkOrderCharge[], name?: string) => void,
  currencyFormatter: ReturnType<typeof useCurrencyFormatter>,
  locationIds: ID[],
  shouldShowPrice: boolean,
): ListRow[] {
  const fetch = useAuthenticatedFetch();
  const customFieldsPresetsQuery = useCustomFieldsPresetsQuery({ fetch, type: 'LINE_ITEM' });

  const locationQueries = useLocationQueries({ fetch, ids: locationIds });
  const inventoryItemIds = productVariants.flatMap(pv => [
    pv.inventoryItem.id,
    ...pv.productVariantComponents.map(pvc => pvc.productVariant.inventoryItem.id),
  ]);
  const inventoryItemQueries = useUnbatchedInventoryItemQueries({
    fetch,
    inventoryItems: locationIds.flatMap(locationId => inventoryItemIds.map(id => ({ id, locationId }))),
  });

  if (!customFieldsPresetsQuery.data) {
    return [];
  }

  return productVariants.map(productVariant => {
    const productVariants = productVariant.requiresComponents
      ? productVariant.productVariantComponents
      : [{ productVariant, quantity: 1 as Int }];

    const displayName = getProductVariantName(productVariant) ?? 'Unknown product';
    const imageUrl = productVariant.image?.url ?? productVariant.product.featuredImage?.url;
    const defaultCharges = productVariant.defaultCharges.map(productVariantDefaultChargeToCreateWorkOrderCharge);

    const label = shouldShowPrice
      ? currencyFormatter(
          BigDecimal.fromMoney(productVariant.price)
            .add(BigDecimal.fromMoney(getTotalPriceForCharges(defaultCharges)))
            .toMoney(),
        )
      : '';

    const inventorySubtitles = locationIds.map(locationId => {
      const locationQuery = locationQueries[locationId];
      const itemQueries = productVariants.map(
        pv => inventoryItemQueries[pv.productVariant.inventoryItem.id]?.[locationId]!,
      );

      if (!locationQuery || Object.values(itemQueries).some(query => !query)) {
        return 'Something went wrong loading inventory state';
      }

      if (locationQuery.isLoading || Object.values(itemQueries).some(query => query.isLoading)) {
        return 'Loading...';
      }

      if (!locationQuery.data || Object.values(itemQueries).some(query => !query.data)) {
        return 'N/A';
      }

      // Available quantity depends on all the product variants in the current bundle
      const availableQuantity = Math.min(
        0,
        ...itemQueries.map((query, i) => {
          const { quantity } = productVariants[i]!;
          const inventoryItem = query.data!;
          const available =
            inventoryItem.inventoryLevel?.quantities.find(hasPropertyValue('name', 'available'))?.quantity ?? NaN;

          return Math.floor(available / quantity);
        }),
      );

      return `${locationQuery.data.name}: ${Number.isNaN(availableQuantity) ? 'N/A' : availableQuantity}`;
    });

    return {
      id: productVariant.id,
      onPress: () => {
        const charges: CreateWorkOrder['charges'][number][] = [];
        const items = productVariants.map(pv => {
          const itemUuid = uuid();

          for (const charge of pv.productVariant.defaultCharges) {
            const defaultCharge = productVariantDefaultChargeToCreateWorkOrderCharge(charge);
            charges.push({
              ...defaultCharge,
              uuid: uuid(),
              workOrderItemUuid: itemUuid,
            });
          }

          return {
            type: 'product',
            uuid: itemUuid,
            productVariantId: pv.productVariant.id,
            quantity: pv.quantity,
            customFields: customFieldsPresetsQuery.data.defaultCustomFields,
            absorbCharges: false,
          } as const;
        });
        onSelect(items, charges);
      },
      leftSide: {
        label: displayName,
        subtitle: trimSubtitles(inventorySubtitles),
        image: { source: imageUrl },
      },
      rightSide: {
        showChevron: true,
        label,
      },
    };
  });
}

function trimSubtitles(subtitles: string[]): ListRow['leftSide']['subtitle'] {
  return match(subtitles.slice(0, 3))
    .with([P._, P._, P._], identity)
    .with([P._, P._], identity)
    .with([P._], identity)
    .otherwise(() => undefined);
}
