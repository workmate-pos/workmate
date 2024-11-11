import { ProductVariant, useProductVariantsQuery } from '@work-orders/common/queries/use-product-variants-query.js';
import { UseRouter } from '../router.js';
import { useDebouncedState } from '../../hooks/use-debounced-state.js';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { ListPopup } from '../ListPopup.js';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import { useState } from 'react';
import { SERVICE_METAFIELD_VALUE_TAG_NAME } from '@work-orders/common/metafields/product-service-type.js';
import { escapeQuotationMarks } from '@work-orders/common/util/escape.js';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { match } from 'ts-pattern';
import { USES_SERIAL_NUMBERS_TAG } from '@work-orders/common/metafields/uses-serial-numbers.js';

export type ProductVariantSelectorProps = {
  onSelect: (productVariant: ProductVariant) => void;
  onClear?: () => void;
  useRouter: UseRouter;
  filters?: {
    type?: 'product' | 'serial' | 'service';
    status?: ('draft' | 'active')[];
  };
};

const defaultFilters = {
  status: ['active'],
} as const satisfies ProductVariantSelectorProps['filters'];

export function ProductVariantSelector({ useRouter, onSelect, onClear, filters }: ProductVariantSelectorProps) {
  const { status, type } = {
    ...defaultFilters,
    ...filters,
  };

  const fetch = useAuthenticatedFetch();
  const [query, setQuery] = useDebouncedState('');
  const productVariantsQuery = useProductVariantsQuery({
    fetch,
    params: {
      first: 50,
      query: [
        query,
        status ? `product_status:${status.join(',')}` : '',
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
          .with(undefined, () => '')
          .exhaustive(),
      ]
        .filter(x => !!x.trim())
        .map(q => `(${q})`)
        .join(' AND '),
    },
  });

  const [page, setPage] = useState(1);

  const allProductVariants = productVariantsQuery.data?.pages.flat() ?? [];
  const pageProductVariants = productVariantsQuery.data?.pages[page - 1] ?? [];

  // TODO: More options like what to show in badge etc

  return (
    <ListPopup
      title="Select product"
      query={{ query, setQuery }}
      resourceName={{ singular: 'product', plural: 'products' }}
      pagination={{
        page,
        onPageChange: setPage,
        onFetchNextPage: () => productVariantsQuery.fetchNextPage(),
        hasNextPage: productVariantsQuery.hasNextPage,
        pageCount: productVariantsQuery.data?.pages?.length ?? 0,
      }}
      isLoadingMore={productVariantsQuery.isFetching}
      imageDisplayStrategy="always"
      selection={{
        type: 'select',
        onSelect: productVariantId =>
          productVariantId === ''
            ? onClear?.()
            : onSelect(allProductVariants.find(pv => pv.id === productVariantId) ?? never()),
        items: [
          onClear ? { id: '', leftSide: { label: 'Clear' } } : null,
          ...pageProductVariants.map(pv => ({
            id: pv.id,
            leftSide: {
              label: getProductVariantName(pv) ?? 'Unknown product',
              image: {
                source: pv.image?.url ?? pv.product.featuredImage?.url,
              },
            },
          })),
        ].filter(isNonNullable),
      }}
      useRouter={useRouter}
    />
  );
}
