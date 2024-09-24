import { useDebouncedState } from '@work-orders/common-pos/hooks/use-debounced-state.js';
import { List, ListRow, ScrollView, Stack, Text, useApi } from '@shopify/ui-extensions-react/point-of-sale';
import { ID } from '@web/schemas/generated/ids.js';
import { CreateStockTransferDispatchProxy } from '../../create-stock-transfer/reducer.js';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { ProductVariant, useProductVariantsQuery } from '@work-orders/common/queries/use-product-variants-query.js';
import { parseGid } from '@teifi-digital/shopify-app-toolbox/shopify';
import { Int, StockTransferLineItem } from '@web/schemas/generated/create-stock-transfer.js';
import { PaginationControls } from '@work-orders/common-pos/components/PaginationControls.js';
import { useState } from 'react';
import { ControlledSearchBar } from '@teifi-digital/pos-tools/components/ControlledSearchBar.js';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { unique } from '@teifi-digital/shopify-app-toolbox/array';
import { useInventoryItemQueries } from '@work-orders/common/queries/use-inventory-item-query.js';
import { uuid } from '@work-orders/common/util/uuid.js';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { UUID } from '@work-orders/common/util/uuid.js';

export function StockTransferProductSelector({
  locationId,
  dispatch,
}: {
  locationId: ID;
  dispatch: CreateStockTransferDispatchProxy;
}) {
  const [query, setQuery] = useDebouncedState('');
  const { toast } = useApi<'pos.home.modal.render'>();

  const fetch = useAuthenticatedFetch();
  const productVariantsQuery = useProductVariantsQuery({
    fetch,
    params: {
      first: 50 as Int,
      query: [query, 'product_status:active', `location_id:${parseGid(locationId).id}`]
        .filter(Boolean)
        .map(q => `(${q})`)
        .join(' AND '),
    },
  });

  const [page, setPage] = useState(1);
  const pagination = (
    <PaginationControls
      page={page}
      pageCount={productVariantsQuery.data?.pages?.length ?? 0}
      onPageChange={setPage}
      hasNextPage={productVariantsQuery.hasNextPage ?? false}
      isLoadingNextPage={productVariantsQuery.isLoading}
      onFetchNextPage={productVariantsQuery.fetchNextPage}
    />
  );

  const selectLineItems = (lineItems: StockTransferLineItem[]) => {
    setQuery('', true);
    dispatch.addLineItems({ lineItems });
    const productOrProducts = lineItems.length === 1 ? 'Product' : 'products';
    const productCount = lineItems.length === 1 ? '' : String(lineItems.length);
    toast.show(`${productCount} ${productOrProducts} added to transfer`.trim(), { duration: 1000 });
  };

  const pageProductVariants = productVariantsQuery.data?.pages?.[page - 1] ?? [];
  const rows = useProductVariantRows(pageProductVariants, locationId, selectLineItems);

  return (
    <ScrollView>
      <ControlledSearchBar
        value={query}
        onTextChange={(query: string) => setQuery(query, !query)}
        onSearch={() => {}}
        placeholder={'Search products'}
      />
      {pagination}
      <List
        data={rows}
        imageDisplayStrategy={'always'}
        isLoadingMore={productVariantsQuery.isLoading}
        onEndReached={() => productVariantsQuery.fetchNextPage()}
      />
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
  selectLineItems: (lineItems: StockTransferLineItem[]) => void,
): ListRow[] {
  const fetch = useAuthenticatedFetch();

  const inventoryItemIds = unique(productVariants.map(productVariant => productVariant.inventoryItem.id));
  const inventoryItemQueries = useInventoryItemQueries({ fetch, locationId, ids: inventoryItemIds });

  return productVariants.map<ListRow>(productVariant => {
    const inventoryItemQuery = inventoryItemQueries[productVariant.inventoryItem.id];
    const imageUrl =
      inventoryItemQuery?.data?.variant?.image?.url ?? inventoryItemQuery?.data?.variant?.product?.featuredImage?.url;

    return {
      id: productVariant.id,
      leftSide: {
        label: getProductVariantName(productVariant) ?? 'Unknown product',
        image: {
          source: imageUrl,
          badge: inventoryItemQuery?.data?.inventoryLevel?.quantities?.find(quantity => quantity.name === 'available')
            ?.quantity,
        },
      },
      rightSide: {
        showChevron: true,
      },
      onPress() {
        selectLineItems([
          {
            uuid: uuid() as UUID,
            inventoryItemId: productVariant.inventoryItem.id,
            quantity: 1 as Int,
            status: 'PENDING',
            productVariantTitle: productVariant.title,
            productTitle: productVariant.product.title,
            shopifyOrderLineItem: null,
            purchaseOrderLineItem: null,
          },
        ]);
      },
    };
  });
}
