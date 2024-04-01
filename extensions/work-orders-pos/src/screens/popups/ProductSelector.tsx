import { Button, List, ListRow, ScrollView, Stack, Text, useExtensionApi } from '@shopify/retail-ui-extensions-react';
import { ProductVariant, useProductVariantsQuery } from '@work-orders/common/queries/use-product-variants-query.js';
import { uuid } from '../../util/uuid.js';
import { Int } from '@web/schemas/generated/create-work-order.js';
import { CreateWorkOrderCharge, CreateWorkOrderItem } from '../../types.js';
import { parseGid } from '@teifi-digital/shopify-app-toolbox/shopify';
import { useServiceCollectionIds } from '../../hooks/use-service-collection-ids.js';
import { productVariantDefaultChargeToCreateWorkOrderCharge } from '../../dto/product-variant-default-charges.js';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { useCurrencyFormatter } from '@work-orders/common-pos/hooks/use-currency-formatter.js';
import { ControlledSearchBar } from '@teifi-digital/pos-tools/components/ControlledSearchBar.js';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { Product } from '@web/schemas/generated/create-purchase-order.js';
import { useRouter } from '../../routes.js';
import { useDebouncedState } from '@work-orders/common-pos/hooks/use-debounced-state.js';

// TODO: Share this screen too + more

export function ProductSelector({
  onSelect,
}: {
  onSelect: (arg: { item: CreateWorkOrderItem; charges: CreateWorkOrderCharge[] }) => void;
}) {
  const [query, setQuery] = useDebouncedState('');

  const { toast } = useExtensionApi<'pos.home.modal.render'>();

  const fetch = useAuthenticatedFetch();
  const serviceCollectionIds = useServiceCollectionIds();
  const collectionQueries =
    serviceCollectionIds?.map(collectionId => `NOT collection:${parseGid(collectionId).id}`) ?? [];
  const productVariantsQuery = useProductVariantsQuery({
    fetch,
    params: {
      query: [query, ...collectionQueries]
        .filter(Boolean)
        .map(q => `(${q})`)
        .join(' AND '),
    },
  });

  const productVariants = productVariantsQuery.data?.pages.flat() ?? [];
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

  const rows = getProductVariantRows(productVariants, internalOnSelect, currencyFormatter);
  const router = useRouter();

  return (
    <ScrollView>
      <Button
        title={'New Product'}
        variant={'primary'}
        onPress={() => {
          router.push('ProductCreator', {
            initialProduct: {},
            onCreate: (product: Product) =>
              internalOnSelect(
                {
                  quantity: product.quantity,
                  uuid: uuid(),
                  productVariantId: product.productVariantId,
                  absorbCharges: false,
                },
                [],
              ),
          });
        }}
      />

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
        imageDisplayStrategy={'always'}
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
  );
}

function getProductVariantRows(
  productVariants: ProductVariant[],
  onSelect: (lineItem: CreateWorkOrderItem, defaultCharges: CreateWorkOrderCharge[], name?: string) => void,
  currencyFormatter: ReturnType<typeof useCurrencyFormatter>,
): ListRow[] {
  return productVariants.map(variant => {
    const displayName = getProductVariantName(variant) ?? 'Unknown product';

    const imageUrl = variant.image?.url ?? variant.product.featuredImage?.url;

    const defaultCharges = variant.defaultCharges.map(productVariantDefaultChargeToCreateWorkOrderCharge);

    return {
      id: variant.id,
      onPress: () => {
        const itemUuid = uuid();

        onSelect(
          {
            uuid: itemUuid,
            productVariantId: variant.id,
            quantity: 1 as Int,
            absorbCharges: false,
          },
          defaultCharges.map(charge => ({ ...charge, uuid: uuid(), workOrderItemUuid: itemUuid })),
        );
      },
      leftSide: {
        label: displayName,
        subtitle: variant.product.description ? [variant.product.description] : undefined,
        image: { source: imageUrl },
      },
      rightSide: {
        showChevron: true,
        label: currencyFormatter(variant.price),
      },
    };
  });
}
