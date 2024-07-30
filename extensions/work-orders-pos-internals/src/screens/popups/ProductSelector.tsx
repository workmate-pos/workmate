import { Button, List, ListRow, ScrollView, Stack, Text, useExtensionApi } from '@shopify/retail-ui-extensions-react';
import { ProductVariant, useProductVariantsQuery } from '@work-orders/common/queries/use-product-variants-query.js';
import { uuid } from '../../util/uuid.js';
import { Int } from '@web/schemas/generated/create-work-order.js';
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
import { useState } from 'react';
import { PaginationControls } from '@work-orders/common-pos/components/PaginationControls.js';
import { SERVICE_METAFIELD_VALUE_TAG_NAME } from '@work-orders/common/metafields/product-service-type.js';
import { escapeQuotationMarks } from '@work-orders/common/util/escape.js';
import { useCustomFieldsPresetsQuery } from '@work-orders/common/queries/use-custom-fields-presets-query.js';
import { useScreen } from '@teifi-digital/pos-tools/router';
import { getTotalPriceForCharges } from '@work-orders/common/create-work-order/charges.js';
import { ResponsiveStack } from '@teifi-digital/pos-tools/components/ResponsiveStack.js';
import { ResponsiveGrid } from '@teifi-digital/pos-tools/components/ResponsiveGrid.js';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';

export function ProductSelector({
  onSelect,
  companyLocationId,
}: {
  onSelect: (arg: { item: CreateWorkOrderItem; charges: CreateWorkOrderCharge[] }) => void;
  companyLocationId: ID | null;
}) {
  const [query, setQuery] = useDebouncedState('');

  const { toast } = useExtensionApi<'pos.home.modal.render'>();

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
    lineItem: CreateWorkOrderItem,
    charges: CreateWorkOrderCharge[],
    name: string = 'Product',
  ) => {
    setQuery('', true);
    onSelect({ item: lineItem, charges });
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
      <ResponsiveGrid columns={2}>
        <Button
          title={'New Product'}
          variant={'primary'}
          onPress={() =>
            router.push('ProductCreator', {
              initialProduct: {},
              onCreate: product =>
                internalOnSelect(
                  {
                    type: 'product',
                    quantity: product.quantity,
                    uuid: uuid(),
                    productVariantId: product.productVariantId,
                    absorbCharges: false,
                    customFields: customFieldsPresetsQuery.data.defaultCustomFields,
                  },
                  [],
                ),
            })
          }
        />
        <Button
          title={'Custom Product'}
          variant={'primary'}
          onPress={async () => {
            await router.popCurrent();
            internalOnSelect(
              {
                type: 'custom-item',
                quantity: 1 as Int,
                absorbCharges: false,
                customFields: customFieldsPresetsQuery.data.defaultCustomFields,
                uuid: uuid(),
                name: 'Unnamed product',
                unitPrice: BigDecimal.ONE.toMoney(),
              },
              [],
            );
          }}
        />
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
  onSelect: (lineItem: CreateWorkOrderItem, defaultCharges: CreateWorkOrderCharge[], name?: string) => void,
  currencyFormatter: ReturnType<typeof useCurrencyFormatter>,
  shouldShowPrice: boolean,
): ListRow[] {
  const fetch = useAuthenticatedFetch();
  const customFieldsPresetsQuery = useCustomFieldsPresetsQuery({ fetch, type: 'LINE_ITEM' });

  if (!customFieldsPresetsQuery.data) {
    return [];
  }

  return productVariants.map(variant => {
    const displayName = getProductVariantName(variant) ?? 'Unknown product';

    const imageUrl = variant.image?.url ?? variant.product.featuredImage?.url;

    const defaultCharges = variant.defaultCharges.map(productVariantDefaultChargeToCreateWorkOrderCharge);

    const label = shouldShowPrice
      ? currencyFormatter(
          BigDecimal.fromMoney(variant.price)
            .add(BigDecimal.fromMoney(getTotalPriceForCharges(defaultCharges)))
            .toMoney(),
        )
      : '';

    return {
      id: variant.id,
      onPress: () => {
        const itemUuid = uuid();

        onSelect(
          {
            type: 'product',
            uuid: itemUuid,
            productVariantId: variant.id,
            quantity: 1 as Int,
            absorbCharges: false,
            customFields: customFieldsPresetsQuery.data.defaultCustomFields,
          },
          defaultCharges.map(charge => ({
            ...charge,
            uuid: uuid(),
            workOrderItem: { type: 'product', uuid: itemUuid },
          })),
        );
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
  });
}
