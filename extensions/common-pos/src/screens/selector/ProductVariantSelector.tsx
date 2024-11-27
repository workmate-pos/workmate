import { ProductVariant, useProductVariantsQuery } from '@work-orders/common/queries/use-product-variants-query.js';
import { UseRouter } from '../router.js';
import { useDebouncedState } from '../../hooks/use-debounced-state.js';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { ReactNode, useEffect } from 'react';
import { SERVICE_METAFIELD_VALUE_TAG_NAME } from '@work-orders/common/metafields/product-service-type.js';
import { escapeQuotationMarks } from '@work-orders/common/util/escape.js';
import { match } from 'ts-pattern';
import { USES_SERIAL_NUMBERS_TAG } from '@work-orders/common/metafields/uses-serial-numbers.js';
import { ID, parseGid } from '@teifi-digital/shopify-app-toolbox/shopify';
import { useInfinitePagination } from '@work-orders/common/util/pagination.js';
import { ProductVariantList, ProductVariantListProps } from '../list/ProductVariantList.js';
import { ScrollView, Stack } from '@shopify/ui-extensions-react/point-of-sale';
import { ControlledSearchBar } from '@teifi-digital/pos-tools/components/ControlledSearchBar.js';

export type ProductVariantSelectorProps = {
  header?: ReactNode;
  onSelect: (productVariant: ProductVariant) => void;
  useRouter: UseRouter;
  filters?: {
    type?: ('product' | 'serial' | 'service')[];
    status?: ('draft' | 'active')[];
    vendor?: string[];
    locationId?: ID[];
  };
  /**
   * Optional list of selected product variant ids.
   * If provided, the modal will
   */
  selectedProductVariantIds?: ID[];
  onSelectedProductVariantIdsChange?: (productVariantIds: ID[]) => void;
  // TODO: Remove this and just handle it in onSelect
  closeOnSelect?: boolean;
  render?: ProductVariantListProps['render'];
};

const defaultFilters = {
  status: ['active'],
} as const satisfies ProductVariantSelectorProps['filters'];

export function ProductVariantSelector({
  useRouter,
  onSelect,
  filters,
  selectedProductVariantIds,
  onSelectedProductVariantIdsChange,
  closeOnSelect = true,
  render,
  header,
}: ProductVariantSelectorProps) {
  const { status, type, vendor, locationId } = {
    ...defaultFilters,
    ...filters,
  };

  const fetch = useAuthenticatedFetch();
  const [query, setQuery, optimisticQuery] = useDebouncedState('');
  const productVariantsQuery = useProductVariantsQuery({
    fetch,
    params: {
      first: 50,
      query: [
        status.map(status => `product_status:${status}`).join(' OR ') ?? '',
        vendor?.map(vendor => `vendor:"${escapeQuotationMarks(vendor)}"`).join(' OR ') ?? '',
        locationId?.map(locationId => `location_id:${parseGid(locationId).id}`).join(' OR ') ?? '',
        type
          ?.map(type =>
            match(type)
              .with('product', () =>
                Object.values(SERVICE_METAFIELD_VALUE_TAG_NAME)
                  .map(tag => `tag_not:"${escapeQuotationMarks(tag)}"`)
                  .join(' AND '),
              )
              .with('service', () =>
                Object.values(SERVICE_METAFIELD_VALUE_TAG_NAME)
                  .map(tag => `tag:"${escapeQuotationMarks(tag)}"`)
                  .join(' OR '),
              )
              .with('serial', () => `tag:"${escapeQuotationMarks(USES_SERIAL_NUMBERS_TAG)}"`)
              .exhaustive(),
          )
          .join(' OR ') ?? '',
      ]

        .filter(x => !!x.trim())
        .map(q => `(${q})`)
        .join(' AND '),
    },
  });

  const { page, reset, ...pagination } = useInfinitePagination({
    pages: productVariantsQuery.data?.pages ?? [],
    hasNext: productVariantsQuery.hasNextPage,
    onNext: productVariantsQuery.fetchNextPage,
  });

  useEffect(() => {
    reset();
  }, [query]);

  const router = useRouter();

  return (
    <ScrollView>
      {header && (
        <Stack direction="vertical" paddingVertical="Small">
          {header}
        </Stack>
      )}

      <ProductVariantList
        selectable={selectedProductVariantIds !== undefined}
        selectedItems={selectedProductVariantIds}
        onSelectionChange={onSelectedProductVariantIdsChange}
        productVariantIds={page?.map(productVariant => productVariant.id) ?? []}
        loading={productVariantsQuery.isFetching}
        pagination={pagination}
        filterControl={
          <ControlledSearchBar
            value={optimisticQuery}
            placeholder="Search product variants"
            onSearch={() => {}}
            editable
            onTextChange={setQuery}
          />
        }
        render={render}
        onClick={productVariantId => {
          const productVariant = page?.find(productVariant => productVariant.id === productVariantId);

          if (!productVariant) {
            console.error('Could not find product variant', productVariantId);
            return;
          }

          onSelect(productVariant);

          if (closeOnSelect) {
            router.popCurrent();
          }
        }}
      />
    </ScrollView>
  );
}
