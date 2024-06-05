import { Button, List, ListRow, ScrollView, Stack, Text } from '@shopify/retail-ui-extensions-react';
import { ProductVariant, useProductVariantsQuery } from '@work-orders/common/queries/use-product-variants-query.js';
import { uuid } from '../../util/uuid.js';
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
  screen.setIsLoading(customFieldsPresetsQuery.isLoading);

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

  return (
    <ScrollView>
      <Button
        title={'Add labour to line item'}
        variant={'primary'}
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

  const defaultCustomFieldPresets = customFieldsPresetsQuery.data?.filter(preset => preset.default);
  const defaultCustomFieldKeys = defaultCustomFieldPresets?.flatMap(preset => preset.keys);
  const defaultCustomFields = defaultCustomFieldKeys
    ? Object.fromEntries(defaultCustomFieldKeys.map(key => [key, '']))
    : undefined;

  const router = useRouter();

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
          if (!defaultCustomFields) {
            return;
          }

          const itemUuid = uuid();

          await router.popCurrent();

          onSelect({
            item: {
              uuid: itemUuid,
              productVariantId: variant.id,
              quantity: 1 as Int,
              absorbCharges: type === QUANTITY_ADJUSTING_SERVICE,
              customFields: defaultCustomFields,
            },
            charges: defaultCharges.map<CreateWorkOrderCharge>(charge => ({
              ...charge,
              uuid: uuid(),
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
