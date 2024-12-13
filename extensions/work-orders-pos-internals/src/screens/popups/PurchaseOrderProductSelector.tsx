import { CreatePurchaseOrder, Int, Product } from '@web/schemas/generated/create-purchase-order.js';
import { Button, List, ListRow, ScrollView, Stack, Text, useApi } from '@shopify/ui-extensions-react/point-of-sale';
import { ProductVariant, useProductVariantsQuery } from '@work-orders/common/queries/use-product-variants-query.js';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { ID, parseGid } from '@teifi-digital/shopify-app-toolbox/shopify';
import { useInventoryItemQueries } from '@work-orders/common/queries/use-inventory-item-query.js';
import { useRouter } from '../../routes.js';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { ControlledSearchBar } from '@teifi-digital/pos-tools/components/ControlledSearchBar.js';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { BigDecimal, Decimal, Money } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { useLocationQuery } from '@work-orders/common/queries/use-location-query.js';
import { useScreen } from '@teifi-digital/pos-tools/router';
import { NonNullableValues } from '@work-orders/common-pos/types/NonNullableValues.js';
import { ResponsiveGrid } from '@teifi-digital/pos-tools/components/ResponsiveGrid.js';
import { useDebouncedState } from '@work-orders/common-pos/hooks/use-debounced-state.js';
import { useState } from 'react';
import { PaginationControls } from '@work-orders/common-pos/components/PaginationControls.js';
import { uuid } from '@work-orders/common/util/uuid.js';
import { escapeQuotationMarks } from '@work-orders/common/util/escape.js';
import { useCustomFieldsPresetsQuery } from '@work-orders/common/queries/use-custom-fields-presets-query.js';
import { ImportSpecialOrderLineItemsButton } from '../../components/ImportSpecialOrderLineItemsButton.js';

export function PurchaseOrderProductSelector({
  filters: { vendorName, locationId },
  onSelect,
  createPurchaseOrder,
}: {
  filters: NonNullableValues<Pick<CreatePurchaseOrder, 'vendorName' | 'locationId'>>;
  onSelect: (product: Product) => void;
  createPurchaseOrder: Pick<CreatePurchaseOrder, 'name' | 'lineItems'>;
}) {
  const [query, setQuery] = useDebouncedState('');

  const { toast } = useApi<'pos.home.modal.render'>();

  const fetch = useAuthenticatedFetch();

  const locationQuery = useLocationQuery({ fetch, id: locationId });
  const customFieldsPresetsQuery = useCustomFieldsPresetsQuery({ fetch, type: 'LINE_ITEM' });

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

  const isLoading = locationQuery.isLoading || customFieldsPresetsQuery.isLoading;

  screen.setIsLoading(isLoading);

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

  if (isLoading) {
    return null;
  }

  if (customFieldsPresetsQuery.isError || !customFieldsPresetsQuery.data) {
    return (
      <Stack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
        <Text color="TextCritical" variant="body">
          {extractErrorMessage(customFieldsPresetsQuery.error, 'Error loading custom fields presets')}
        </Text>
      </Stack>
    );
  }

  return (
    <ScrollView>
      <Stack direction={'horizontal'} paddingVertical={'Medium'} alignment={'center'}>
        <Text variant="captionMedium" color="TextSubdued">
          Showing products for vendor {vendorName}, and stock for location {locationQuery.data?.name ?? 'N/A'}
        </Text>
      </Stack>

      <ResponsiveGrid columns={2}>
        <ImportSpecialOrderLineItemsButton
          vendorName={vendorName}
          locationId={locationId}
          onSelect={products => {
            selectProducts(products);
            // we must pop here because createPurchaseOrder must be up-to-date
            // to correctly calculate the remaining quantity of special order line items
            router.popCurrent();
          }}
          createPurchaseOrder={createPurchaseOrder}
        />
        <Button
          title={'New product'}
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
                selectProducts([
                  {
                    uuid: uuid(),
                    customFields: customFieldsPresetsQuery.data.defaultCustomFields,
                    serialNumber: null,
                    productVariantId: product.productVariantId,
                    quantity: product.quantity,
                    unitCost: product.unitCost,
                    specialOrderLineItem: product.specialOrderLineItem,
                  },
                ]);
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
  const customFieldsPresetsQuery = useCustomFieldsPresetsQuery({ fetch, type: 'LINE_ITEM' });

  const inventoryItemIds = productVariants.flatMap(variant => [
    variant.inventoryItem.id,
    ...variant.productVariantComponents.map(({ productVariant }) => productVariant.inventoryItem.id),
  ]);
  const inventoryItemQueries = useInventoryItemQueries({ fetch, ids: inventoryItemIds, locationId });

  if (!customFieldsPresetsQuery.data) {
    return [];
  }

  return productVariants.map<ListRow>(variant => {
    const displayName = getProductVariantName(variant) ?? 'Unknown product';
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
              specialOrderLineItem: null,
              productVariantId: variant.id,
              quantity: 1 as Int,
              unitCost: decimalToMoneyOrDefault(inventoryItem?.unitCost?.amount, BigDecimal.ZERO.toMoney()),
              customFields: customFieldsPresetsQuery.data.defaultCustomFields,
              serialNumber: null,
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
              specialOrderLineItem: null,
              handle: productVariant.product.handle,
              productVariantId: productVariant.id,
              quantity: 1 as Int,
              name: getProductVariantName(productVariant) ?? 'Unknown product',
              sku: productVariant.sku,
              unitCost: decimalToMoneyOrDefault(inventoryItem?.unitCost?.amount, BigDecimal.ZERO.toMoney()),
              customFields: customFieldsPresetsQuery.data.defaultCustomFields,
              serialNumber: null,
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
