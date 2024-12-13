import { Button, List, ListRow, ScrollView, Stack, Text } from '@shopify/ui-extensions-react/point-of-sale';
import { ProductVariant, useProductVariantsQuery } from '@work-orders/common/queries/use-product-variants-query.js';
import { uuid } from '@work-orders/common/util/uuid.js';
import { Int } from '@web/schemas/generated/create-work-order.js';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { CreateWorkOrderCharge, CreateWorkOrderItem } from '../../types.js';
import { productVariantDefaultChargeToCreateWorkOrderCharge } from '@work-orders/common/create-work-order/product-variant-default-charges.js';
import { isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { useCurrencyFormatter } from '@work-orders/common-pos/hooks/use-currency-formatter.js';
import { ControlledSearchBar } from '@teifi-digital/pos-tools/components/ControlledSearchBar.js';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { useRouter } from '../../routes.js';
import { useDebouncedState } from '@work-orders/common-pos/hooks/use-debounced-state.js';
import { useState } from 'react';
import { PaginationControls } from '@work-orders/common-pos/components/PaginationControls.js';
import {
  getProductServiceType,
  QUANTITY_ADJUSTING_SERVICE,
  SERVICE_METAFIELD_VALUE_TAG_NAME,
} from '@work-orders/common/metafields/product-service-type.js';
import { escapeQuotationMarks } from '@work-orders/common/util/escape.js';
import { BigDecimal } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { useCustomFieldsPresetsQuery } from '@work-orders/common/queries/use-custom-fields-presets-query.js';
import { useScreen } from '@teifi-digital/pos-tools/router';
import { WIPCreateWorkOrder } from '@work-orders/common/create-work-order/reducer.js';
import { getTotalPriceForCharges } from '@work-orders/common/create-work-order/charges.js';
import { ResponsiveGrid } from '@teifi-digital/pos-tools/components/ResponsiveGrid.js';
import { ResponsiveStack } from '@teifi-digital/pos-tools/components/ResponsiveStack.js';
import { UUID } from '@work-orders/common/util/uuid.js';

type OnSelect = (arg: { item: CreateWorkOrderItem; charges: CreateWorkOrderCharge[] }) => void;

export function ServiceSelector({
  onSelect,
  createWorkOrder,
  onAddLabourToItem,
}: {
  onSelect: OnSelect;
  onAddLabourToItem: (item: CreateWorkOrderItem) => void;
  createWorkOrder: WIPCreateWorkOrder;
}) {
  const [query, setQuery] = useDebouncedState('');

  const fetch = useAuthenticatedFetch();
  const productVariantsQuery = useProductVariantsQuery({
    fetch,
    params: {
      first: 50 as Int,
      query: [
        query,
        'product_status:active',
        Object.values(SERVICE_METAFIELD_VALUE_TAG_NAME)
          .map(tag => `tag:"${escapeQuotationMarks(tag)}"`)
          .join(' OR '),
      ].join(' AND '),
    },
  });
  const customFieldsPresetsQuery = useCustomFieldsPresetsQuery({ fetch, type: 'LINE_ITEM' });

  const screen = useScreen();

  const isLoading = customFieldsPresetsQuery.isLoading;
  screen.setIsLoading(isLoading);

  const currencyFormatter = useCurrencyFormatter();

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

  const rows = useProductVariantRows(productVariantsQuery?.data?.pages?.[page - 1] ?? [], onSelect, currencyFormatter);

  const router = useRouter();

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
          title={'New service'}
          type={'primary'}
          onPress={() =>
            router.push('ProductCreator', {
              initialProduct: {},
              service: true,
              onCreate: product =>
                onSelect({
                  item: {
                    type: 'product',
                    uuid: uuid() as UUID,
                    productVariantId: product.productVariantId,
                    absorbCharges: product.serviceType === QUANTITY_ADJUSTING_SERVICE,
                    customFields: customFieldsPresetsQuery.data.defaultCustomFields,
                    quantity: product.quantity,
                    serial: null,
                  },
                  charges: [],
                }),
            })
          }
        />
        <Button
          title={'Add labour to line item'}
          type={'primary'}
          onPress={() =>
            router.push('ItemSelector', {
              filter: 'can-add-labour',
              onSelect: async item => {
                await router.popCurrent();
                onAddLabourToItem(item);
              },
              items: createWorkOrder.items,
            })
          }
        />
      </ResponsiveGrid>

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
      {pagination}
      <List data={rows} imageDisplayStrategy={'always'} />
      {productVariantsQuery.isFetching && (
        <Stack direction="horizontal" alignment="center" flex={1} paddingVertical="ExtraLarge">
          <Text variant="body" color="TextSubdued">
            Loading services...
          </Text>
        </Stack>
      )}
      {!productVariantsQuery.isFetching && productVariantsQuery.isSuccess && rows.length === 0 && (
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
      {pagination}
    </ScrollView>
  );
}

function useProductVariantRows(
  productVariants: ProductVariant[],
  onSelect: OnSelect,
  currencyFormatter: ReturnType<typeof useCurrencyFormatter>,
): ListRow[] {
  const fetch = useAuthenticatedFetch();
  const customFieldsPresetsQuery = useCustomFieldsPresetsQuery({ fetch, type: 'LINE_ITEM' });

  const router = useRouter();

  if (!customFieldsPresetsQuery.data) {
    return [];
  }

  return productVariants
    .map<ListRow | null>(variant => {
      const displayName = getProductVariantName(variant) ?? 'Unknown service';

      const imageUrl = variant.image?.url ?? variant.product.featuredImage?.url;

      const type = getProductServiceType(variant.product.serviceType?.value);

      if (type === null) {
        return null;
      }

      const defaultCharges = variant.defaultCharges.map(productVariantDefaultChargeToCreateWorkOrderCharge);

      let label: string | undefined = undefined;

      const defaultChargesPrice = getTotalPriceForCharges(defaultCharges);
      const basePrice = type === QUANTITY_ADJUSTING_SERVICE ? BigDecimal.ZERO.toMoney() : variant.price;

      label = currencyFormatter(
        BigDecimal.fromMoney(basePrice).add(BigDecimal.fromMoney(defaultChargesPrice)).toMoney(),
      );

      return {
        id: variant.id,
        onPress: async () => {
          const itemUuid = uuid() as UUID;

          await router.popCurrent();

          onSelect({
            item: {
              type: 'product',
              uuid: itemUuid,
              productVariantId: variant.id,
              quantity: 1 as Int,
              absorbCharges: type === QUANTITY_ADJUSTING_SERVICE,
              customFields: customFieldsPresetsQuery.data.defaultCustomFields,
              serial: null,
            },
            charges: defaultCharges.map<CreateWorkOrderCharge>(charge => ({
              ...charge,
              uuid: uuid() as UUID,
              workOrderItemUuid: itemUuid,
            })),
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
