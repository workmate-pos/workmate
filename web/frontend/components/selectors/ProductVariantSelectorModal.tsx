import { ProductVariant, useProductVariantsQuery } from '@work-orders/common/queries/use-product-variants-query.js';
import { SERVICE_METAFIELD_VALUE_TAG_NAME } from '@work-orders/common/metafields/product-service-type.js';
import { filters } from 'liquidjs';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { escapeQuotationMarks } from '@work-orders/common/util/escape.js';
import { isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
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
  Modal,
  ResourceItem,
  ResourceList,
  SkeletonThumbnail,
  Text,
  Thumbnail,
} from '@shopify/polaris';
import { emptyState } from '@web/frontend/assets/index.js';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';

// TODO: More selectors just like this (same with pos)

export type ProductVariantSelectorModalProps = {
  onSelect: (productVariant: ProductVariant) => void;
  open: boolean;
  onClose: () => void;
  filters?: {
    type?: 'product' | 'service';
    status?: ('draft' | 'active')[];
  };
};

const defaultFilters = {
  status: ['active'],
} as const satisfies ProductVariantSelectorModalProps['filters'];

export function ProductVariantSelectorModal({ onSelect, filters, open, onClose }: ProductVariantSelectorModalProps) {
  const { status, type } = {
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
        status ? `product_status:${status.join(',')}` : null,
        type === 'product'
          ? Object.values(SERVICE_METAFIELD_VALUE_TAG_NAME)
              .map(tag => `tag_not:"${escapeQuotationMarks(tag)}"`)
              .join(' AND ')
          : null,
        type === 'service'
          ? Object.values(SERVICE_METAFIELD_VALUE_TAG_NAME)
              .map(tag => `tag:"${escapeQuotationMarks(tag)}"`)
              .join(' OR ')
          : null,
      ]
        .filter(isNonNullable)
        .map(q => `(${q})`)
        .join(' AND '),
    },
  });

  const [pageIndex, setPageIndex] = useState(0);
  const pagination = getInfiniteQueryPagination(pageIndex, setPageIndex, productVariantsQuery);
  const page = productVariantsQuery.data?.pages[pageIndex] ?? [];

  return (
    <Modal open={open} title={'Product Variants'} onClose={onClose}>
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
            <EmptyState image={emptyState} heading={'Product Variants'}>
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
          const imageUrl = productVariant.image?.url ?? productVariant.product.featuredImage?.url;
          const label = getProductVariantName(productVariant) ?? 'Unknown product variant';

          return (
            <ResourceItem
              id={productVariant.id}
              onClick={() => {
                onSelect(productVariant);
                onClose();
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
    </Modal>
  );
}