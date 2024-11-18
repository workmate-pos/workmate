import { ProductVariant, useProductVariantsQuery } from '@work-orders/common/queries/use-product-variants-query.js';
import { SERVICE_METAFIELD_VALUE_TAG_NAME } from '@work-orders/common/metafields/product-service-type.js';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { escapeQuotationMarks } from '@work-orders/common/util/escape.js';
import { useToast } from '@teifi-digital/shopify-app-react';
import { useDebouncedState } from '@web/frontend/hooks/use-debounced-state.js';
import { Filters, Modal } from '@shopify/polaris';
import { match } from 'ts-pattern';
import { USES_SERIAL_NUMBERS_TAG } from '@work-orders/common/metafields/uses-serial-numbers.js';
import {
  ProductVariantResourceList,
  ProductVariantResourceListProps,
} from '@web/frontend/components/ProductVariantResourceList.js';
import { useInfinitePagination } from '@web/frontend/hooks/pagination.js';
import { ID, parseGid } from '@teifi-digital/shopify-app-toolbox/shopify';
import { ReactNode, useEffect } from 'react';
import type { ComplexAction } from '@shopify/polaris/build/ts/src/types.js';

// TODO: More selectors just like this (same with pos)

export type ProductVariantSelectorModalProps = {
  header?: ReactNode;
  onSelect: (productVariant: ProductVariant) => void;
  open: boolean;
  onClose: () => void;
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
  secondaryActions?: ComplexAction[];
  render?: ProductVariantResourceListProps['render'];
};

const defaultFilters = {
  status: ['active'],
} as const satisfies ProductVariantSelectorModalProps['filters'];

export function ProductVariantSelectorModal({
  header,
  onSelect,
  filters,
  open,
  onClose,
  selectedProductVariantIds,
  onSelectedProductVariantIdsChange,
  closeOnSelect = true,
  secondaryActions,
  render,
}: ProductVariantSelectorModalProps) {
  const { status, type, vendor, locationId } = {
    ...defaultFilters,
    ...filters,
  };

  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });
  const [query, setQuery, optimisticQuery] = useDebouncedState('');

  const productVariantsQuery = useProductVariantsQuery({
    fetch,
    params: {
      first: 50,
      query: [
        query,
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

  return (
    <>
      <Modal
        open={open}
        title={'Product variants'}
        onClose={onClose}
        loading={productVariantsQuery.isFetchingNextPage}
        secondaryActions={secondaryActions}
      >
        {header}

        <ProductVariantResourceList
          selectable={selectedProductVariantIds !== undefined}
          selectedItems={selectedProductVariantIds}
          onSelectionChange={onSelectedProductVariantIdsChange}
          productVariantIds={page?.map(productVariant => productVariant.id) ?? []}
          loading={productVariantsQuery.isFetching}
          pagination={pagination}
          filterControl={
            <Filters
              queryPlaceholder="Search product variants"
              queryValue={optimisticQuery}
              filters={[]}
              onQueryChange={query => setQuery(query, !query)}
              onQueryClear={() => setQuery('', true)}
              onClearAll={() => setQuery('', true)}
            />
          }
          onClick={productVariantId => {
            const productVariant = page?.find(productVariant => productVariant.id === productVariantId);

            if (!productVariant) {
              console.error('Could not find product variant', productVariantId);
              return;
            }

            onSelect(productVariant);

            if (closeOnSelect) {
              onClose();
            }
          }}
          render={render}
        />
      </Modal>

      {toast}
    </>
  );
}
