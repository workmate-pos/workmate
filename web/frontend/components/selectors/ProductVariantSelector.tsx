import { ProductVariant, useProductVariantsQuery } from '@work-orders/common/queries/use-product-variants-query.js';
import { SERVICE_METAFIELD_VALUE_TAG_NAME } from '@work-orders/common/metafields/product-service-type.js';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { escapeQuotationMarks } from '@work-orders/common/util/escape.js';
import { useState } from 'react';
import { useToast } from '@teifi-digital/shopify-app-react';
import { useDebouncedState } from '@web/frontend/hooks/use-debounced-state.js';
import { getInfiniteQueryPagination } from '@web/frontend/util/pagination.js';
import {
  BlockStack,
  Card,
  EmptyState,
  InlineStack,
  LegacyFilters,
  ResourceItem,
  ResourceList,
  SkeletonThumbnail,
  Text,
  Thumbnail,
} from '@shopify/polaris';
import { emptyState } from '@web/frontend/assets/index.js';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { match } from 'ts-pattern';
import { USES_SERIAL_NUMBERS_TAG } from '@work-orders/common/metafields/uses-serial-numbers.js';
import { ID, parseGid } from '@teifi-digital/shopify-app-toolbox/shopify';

export type ProductVariantSelectorProps = {
  onSelect?: (productVariant: ProductVariant) => void;
  filters?: {
    type?: 'product' | 'serial' | 'service';
    status?: ('draft' | 'active')[];
    locationId: ID | null;
  };
  renderItem?: (productVariant: ProductVariant) => React.ReactNode;
};

const defaultFilters = {
  status: ['active'],
  locationId: null,
} as const satisfies ProductVariantSelectorProps['filters'];

export function ProductVariantSelector({ onSelect, filters, renderItem }: ProductVariantSelectorProps) {
  const { status, type, locationId } = {
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
        locationId ? `location_id:${parseGid(locationId).id}` : '',
      ]
        .filter(x => !!x.trim())
        .map(q => `(${q})`)
        .join(' AND '),
    },
  });

  const [pageIndex, setPageIndex] = useState(0);
  const pagination = getInfiniteQueryPagination(pageIndex, setPageIndex, productVariantsQuery);
  const page = productVariantsQuery.data?.pages[pageIndex] ?? [];

  return (
    <>
      <ResourceList
        items={page}
        resourceName={{ singular: 'product variant', plural: 'product variants' }}
        loading={productVariantsQuery.isFetching}
        pagination={{
          hasNext: pagination.hasNextPage,
          hasPrevious: pagination.hasPreviousPage,
          onNext: pagination.next,
          onPrevious: pagination.previous,
        }}
        emptyState={
          <Card>
            <EmptyState image={emptyState} heading={'Product variants'}>
              <Text as={'p'} variant={'bodyMd'}>
                No product variants found
              </Text>
            </EmptyState>
          </Card>
        }
        filterControl={
          <LegacyFilters
            queryValue={optimisticQuery}
            filters={[]}
            onQueryChange={query => setQuery(query, !query)}
            onQueryClear={() => setQuery('', true)}
            onClearAll={() => setQuery('', true)}
          />
        }
        renderItem={productVariant => {
          if (renderItem) {
            return renderItem(productVariant);
          }

          const imageUrl = productVariant.image?.url ?? productVariant.product.featuredImage?.url;
          const label = getProductVariantName(productVariant) ?? 'Unknown product variant';

          return (
            <ResourceItem
              id={productVariant.id}
              onClick={() => {
                if (onSelect) {
                  onSelect(productVariant);
                }
              }}
            >
              <InlineStack gap={'400'} wrap={false}>
                {imageUrl && <Thumbnail source={imageUrl} alt={label} />}
                {!imageUrl && <SkeletonThumbnail />}
                <BlockStack gap={'200'}>
                  <Text as="p" variant="bodyMd" fontWeight="bold">
                    {label}
                  </Text>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    {productVariant.sku}
                  </Text>
                </BlockStack>
              </InlineStack>
            </ResourceItem>
          );
        }}
      />

      {toast}
    </>
  );
}