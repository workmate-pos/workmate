import { ProductVariant, useProductVariantsQuery } from '@work-orders/common/queries/use-product-variants-query.js';
import { useDebouncedState } from '@work-orders/common-pos/hooks/use-debounced-state.js';
import { Button, List, ListRow, ScrollView, Stack, Text, useApi } from '@shopify/ui-extensions-react/point-of-sale';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { useEffect, useState } from 'react';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { escapeQuotationMarks } from '@work-orders/common/util/escape.js';
import { useRouter } from '../routes.js';
import { PaginationControls } from '@work-orders/common-pos/components/PaginationControls.js';
import { ResponsiveGrid } from '@teifi-digital/pos-tools/components/ResponsiveGrid.js';
import { ControlledSearchBar } from '@teifi-digital/pos-tools/components/ControlledSearchBar.js';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { useScreen } from '@teifi-digital/pos-tools/router';

export function CycleCountProductSelector({ onSelect }: { onSelect: (productVariants: ProductVariant[]) => void }) {
  const { toast } = useApi<'pos.home.modal.render'>();

  const selectProductVariants = (products: ProductVariant[]) => {
    onSelect(products);
    toast.show(`Added ${products.length} product${products.length === 1 ? '' : 's'} to cycle count`, {
      duration: 1000,
    });
  };

  const [query, setQuery] = useDebouncedState('');
  const [vendorName, setVendorName] = useState<string>();
  const [importVendorName, setImportVendorName] = useState<string>();

  const fetch = useAuthenticatedFetch();

  const productStatusQuery = 'product_status:active';

  const importVendorProductsQuery = importVendorName ? `vendor:"${escapeQuotationMarks(importVendorName)}"` : '';
  const importVendorProductVariantsQuery = useProductVariantsQuery({
    fetch,
    params: {
      first: 100,
      query: [importVendorProductsQuery, productStatusQuery]
        .filter(Boolean)
        .map(q => `(${q})`)
        .join(' AND '),
    },
    options: { enabled: !!importVendorName },
  });

  useEffect(() => {
    if (!importVendorName) {
      return;
    }

    if (importVendorProductVariantsQuery.isError) {
      toast.show('Error importing vendor products');
      setImportVendorName(undefined);
      return;
    }

    if (!importVendorProductVariantsQuery.isFetching && !importVendorProductVariantsQuery.hasNextPage) {
      selectProductVariants(importVendorProductVariantsQuery.data?.pages.flat() ?? []);
      setImportVendorName(undefined);
    } else if (importVendorProductVariantsQuery.hasNextPage) {
      importVendorProductVariantsQuery.fetchNextPage();
    }
  }, [
    importVendorName,
    importVendorProductVariantsQuery.isFetching,
    importVendorProductVariantsQuery.hasNextPage,
    importVendorProductVariantsQuery.data,
  ]);

  const screen = useScreen();
  screen.setIsLoading(importVendorProductVariantsQuery.isFetching);

  const vendorQuery = vendorName ? `vendor:"${escapeQuotationMarks(vendorName)}"` : '';
  const productVariantsQuery = useProductVariantsQuery({
    fetch,
    params: {
      first: 50,
      query: [query, vendorQuery, productStatusQuery]
        .filter(Boolean)
        .map(q => `(${q})`)
        .join(' AND '),
    },
  });

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

  const rows = useProductVariantRows(productVariantsQuery.data?.pages?.[page - 1] ?? [], selectProductVariants);

  return (
    <ScrollView>
      <ResponsiveGrid columns={2}>
        <Button
          title={'Import vendor products'}
          onPress={() =>
            router.push('VendorSelector', {
              onSelect: vendorName => setImportVendorName(vendorName),
            })
          }
        />

        <Button
          title={!vendorName ? 'Showing products for all vendors' : `Showing products for vendor "${vendorName}"`}
          onPress={() =>
            router.push('VendorSelector', {
              onSelect: vendorName => setVendorName(vendorName),
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
  selectProducts: (productVariants: ProductVariant[]) => void,
) {
  return productVariants.map<ListRow>(variant => {
    const displayName = getProductVariantName(variant) ?? 'Unknown product';
    const imageUrl = variant.image?.url ?? variant.product?.featuredImage?.url;

    return {
      id: variant.id,
      onPress: () => selectProducts([variant]),
      leftSide: {
        label: displayName,
        image: { source: imageUrl },
      },
      rightSide: { showChevron: true },
    };
  });
}
