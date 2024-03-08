import { useDebouncedState } from '@work-orders/common/hooks/use-debounced-state.js';
import { type CreatePurchaseOrder, Int, Product } from '@web/schemas/generated/create-purchase-order.js';
import { Button, List, ListRow, ScrollView, Stack, Text, useExtensionApi } from '@shopify/retail-ui-extensions-react';
import { ProductVariant, useProductVariantsQuery } from '@work-orders/common/queries/use-product-variants-query.js';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { ID, parseGid } from '@teifi-digital/shopify-app-toolbox/shopify';
import { useInventoryItemQueries } from '@work-orders/common/queries/use-inventory-item-query.js';
import { NonNullableValues } from '../../types.js';
import { useRouter } from '../../routes.js';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { ControlledSearchBar } from '@teifi-digital/pos-tools/components/ControlledSearchBar.js';
import { extractErrorMessage } from '@teifi-digital/pos-tools/utils/errors.js';
import { BigDecimal } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { Decimal, Money } from '@web/schemas/generated/shop-settings.js';
import { useLocationQuery } from '@work-orders/common/queries/use-location-query.js';
import { useScreen } from '@teifi-digital/pos-tools/router';

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

  const vendorQuery = vendorName ? `vendor:"${vendorName}"` : '';
  const locationIdQuery = locationId ? `location_id:${parseGid(locationId).id}` : '';
  const productVariantsQuery = useProductVariantsQuery({
    fetch,
    params: {
      query: [query, vendorQuery, locationIdQuery].filter(Boolean).join(' AND '),
    },
  });
  const productVariants = productVariantsQuery.data?.pages ?? [];

  const selectProducts = (products: Product[]) => {
    setQuery('', true);
    for (const product of products) onSelect(product);
    const productOrProducts = products.length === 1 ? 'Product' : 'products';
    const productCount = products.length === 1 ? '' : String(products.length);
    toast.show(`${productCount} ${productOrProducts} added to purchase order`.trim(), { duration: 1000 });
  };

  const rows = useProductVariantRows(productVariants.flat(), locationId, selectProducts);

  const router = useRouter();
  const screen = useScreen();
  screen.setIsLoading(locationQuery.isLoading);

  return (
    <ScrollView>
      <Stack direction={'horizontal'} paddingVertical={'Medium'} alignment={'center'}>
        <Text variant="captionMedium" color="TextSubdued">
          Showing products for vendor {vendorName}, and stock for location {locationQuery.data?.name ?? 'N/A'}
        </Text>
      </Stack>

      <Button
        title={'New Product'}
        variant={'primary'}
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
              vendorName,
            },
            onCreate: (product: Product) => selectProducts([product]),
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
        onEndReached={productVariantsQuery.fetchNextPage}
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
              shopifyOrderLineItemId: null,
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
              shopifyOrderLineItemId: null,
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
