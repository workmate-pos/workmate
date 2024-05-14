import { CreatePurchaseOrder, Int, Product } from '@web/schemas/generated/create-purchase-order.js';
import { Button, List, ListRow, ScrollView, Stack, Text, useExtensionApi } from '@shopify/retail-ui-extensions-react';
import { ProductVariant, useProductVariantsQuery } from '@work-orders/common/queries/use-product-variants-query.js';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { ID, parseGid } from '@teifi-digital/shopify-app-toolbox/shopify';
import { useInventoryItemQueries } from '@work-orders/common/queries/use-inventory-item-query.js';
import { useRouter } from '../../routes.js';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { ControlledSearchBar } from '@teifi-digital/pos-tools/components/ControlledSearchBar.js';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { BigDecimal } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { Decimal, Money } from '@web/schemas/generated/shop-settings.js';
import { useLocationQuery } from '@work-orders/common/queries/use-location-query.js';
import { useScreen } from '@teifi-digital/pos-tools/router';
import { NonNullableValues } from '@work-orders/common-pos/types/NonNullableValues.js';
import { ResponsiveGrid } from '@teifi-digital/pos-tools/components/ResponsiveGrid.js';
import { useDebouncedState } from '@work-orders/common-pos/hooks/use-debounced-state.js';
import { useState } from 'react';
import { PaginationControls } from '@work-orders/common-pos/components/PaginationControls.js';
import { v4 as uuid } from 'uuid';
import { escapeQuotationMarks } from '@work-orders/common/util/escape.js';

export function ProductSelector({
  filters: { vendorName, locationId },
  onSelect,
}: {
  filters: NonNullableValues<Pick<CreatePurchaseOrder, 'vendorName' | 'locationId'>>;
  onSelect: (product: Product) => void;
}) {
  const [query, setQuery] = useDebouncedState('');

  const { toast } = useExtensionApi<'pos.home.modal.render'>();

  const fetch = useAuthenticatedFetch();

  const locationQuery = useLocationQuery({ fetch, id: locationId });

  const vendorQuery = vendorName ? `vendor:"${escapeQuotationMarks(vendorName)}"` : '';
  const locationIdQuery = locationId ? `location_id:${parseGid(locationId).id}` : '';
  const productStatusQuery = 'product_status:active';
  const productVariantsQuery = useProductVariantsQuery({
    fetch,
    params: {
      first: 50 as Int,
      query: [query, vendorQuery, locationIdQuery, productStatusQuery]
        .filter(Boolean)
        .map(q => `(${q})`)
        .join(' AND '),
    },
  });

  const selectProducts = (products: Product[]) => {
    setQuery('', true);
    for (const product of products) onSelect(product);
    const productOrProducts = products.length === 1 ? 'Product' : 'products';
    const productCount = products.length === 1 ? '' : String(products.length);
    toast.show(`${productCount} ${productOrProducts} added to purchase order`.trim(), { duration: 1000 });
  };

  const router = useRouter();
  const screen = useScreen();
  screen.setIsLoading(locationQuery.isLoading);

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

  const rows = useProductVariantRows(productVariantsQuery.data?.pages?.[page - 1] ?? [], locationId, selectProducts);

  return (
    <ScrollView>
      <Stack direction={'horizontal'} paddingVertical={'Medium'} alignment={'center'}>
        <Text variant="captionMedium" color="TextSubdued">
          Showing products for vendor {vendorName}, and stock for location {locationQuery.data?.name ?? 'N/A'}
        </Text>
      </Stack>

      <ResponsiveGrid columns={2}>
        <Button
          title={'Select from Order'}
          onPress={() => {
            router.push('OrderSelector', {
              onSelect: orderId => {
                router.push('OrderProductSelector', {
                  orderId,
                  onSave: products => {
                    selectProducts(products);
                    router.popCurrent();
                  },
                });
              },
            });
          }}
        />
        <Button
          title={'New Product'}
          onPress={() => {
            if (!locationId) {
              toast.show('Location id not set');
              return;
            }

            if (!vendorName) {
              toast.show('Vendor name not set');
              return;
            }

            router.push('ProductCreator', {
              initialProduct: {
                locationId,
                vendor: vendorName,
              },
              onCreate: product => {
                selectProducts([{ ...product, uuid: uuid() }]);
                router.popCurrent();
              },
            });
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
  locationId: ID,
  selectProducts: (products: Product[]) => void,
) {
  const fetch = useAuthenticatedFetch();

  const inventoryItemIds = productVariants.flatMap(variant => [
    variant.inventoryItem.id,
    ...variant.productVariantComponents.map(({ productVariant }) => productVariant.inventoryItem.id),
  ]);
  const inventoryItemQueries = useInventoryItemQueries({ fetch, ids: inventoryItemIds, locationId });

  return productVariants.map<ListRow>(variant => {
    const displayName = getProductVariantName(variant) ?? 'Unknown Product';
    const imageUrl = variant.image?.url ?? variant.product?.featuredImage?.url;

    const inventoryItemId = variant.inventoryItem.id;
    const inventoryItemQuery = inventoryItemQueries[inventoryItemId];
    const inventoryItem = inventoryItemQuery?.data;
    let availableQuantity = inventoryItem?.inventoryLevel?.quantities?.find(
      quantity => quantity.name === 'available',
    )?.quantity;

    // todo: clean this mess

    // If this is a bundle, the available quantity is the available quantity of the lowest available component divided by the quantity of that component in this bundle
    if (variant.requiresComponents) {
      let bundleAvailableQuantity: Int | undefined = undefined;

      for (const bundleProductVariant of variant.productVariantComponents) {
        const { quantity, productVariant } = bundleProductVariant;
        const availableQuantityForComponent = inventoryItemQueries[
          productVariant.inventoryItem.id
        ]?.data?.inventoryLevel?.quantities?.find(quantity => quantity.name === 'available')?.quantity;

        if (availableQuantityForComponent === undefined) {
          bundleAvailableQuantity = undefined;
          break;
        }

        const availableQuantityForComponentInBundle = Math.floor(availableQuantityForComponent / quantity) as Int;
        bundleAvailableQuantity =
          bundleAvailableQuantity === undefined
            ? availableQuantityForComponentInBundle
            : (Math.min(bundleAvailableQuantity, availableQuantityForComponentInBundle) as Int);
      }

      availableQuantity = bundleAvailableQuantity;
    }

    // TODO: Only allow clicking once its loaded everything
    return {
      id: variant.id,
      onPress: () => {
        if (!variant.requiresComponents) {
          selectProducts([
            {
              uuid: uuid(),
              shopifyOrderLineItem: null,
              productVariantId: variant.id,
              availableQuantity: 0 as Int,
              quantity: 1 as Int,
              unitCost: decimalToMoneyOrDefault(inventoryItem?.unitCost?.amount, BigDecimal.ZERO.toMoney()),
            },
          ]);
          return;
        }

        // Bundle!

        selectProducts(
          variant.productVariantComponents.flatMap(({ quantity, productVariant }) => {
            const inventoryItem = inventoryItemQueries[productVariant.inventoryItem.id]?.data;

            return Array.from({ length: quantity }, () => ({
              uuid: uuid(),
              shopifyOrderLineItem: null,
              handle: productVariant.product.handle,
              productVariantId: productVariant.id,
              availableQuantity: 0 as Int,
              quantity: 1 as Int,
              name: getProductVariantName(productVariant) ?? 'Unknown Product',
              sku: productVariant.sku,
              unitCost: decimalToMoneyOrDefault(inventoryItem?.unitCost?.amount, BigDecimal.ZERO.toMoney()),
            }));
          }),
        );
      },
      leftSide: {
        label: displayName,
        image: {
          source: imageUrl,
          badge: availableQuantity,
        },
      },
      rightSide: { showChevron: true },
    };
  });
}

function decimalToMoneyOrDefault(decimal: Decimal | null | undefined, defaultValue: Money) {
  if (decimal === null || decimal === undefined) {
    return defaultValue;
  }

  return BigDecimal.fromDecimal(decimal).toMoney();
}
