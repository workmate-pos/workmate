import { DetailedSerial } from '@web/services/serials/get.js';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { useState } from 'react';
import { useCustomerQuery } from '@work-orders/common/queries/use-customer-query.js';
import { useToast } from '@teifi-digital/shopify-app-react';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { useLocationQuery } from '@work-orders/common/queries/use-location-query.js';
import {
  useProductVariantQueries,
  useProductVariantQuery,
} from '@work-orders/common/queries/use-product-variant-query.js';
import { useSerialsQuery } from '@work-orders/common/queries/use-serials-query.js';
import { unique } from '@teifi-digital/shopify-app-toolbox/array';
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
import { getInfiniteQueryPagination } from '@web/frontend/util/pagination.js';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { useDebouncedState } from '@web/frontend/hooks/use-debounced-state.js';
import { emptyState } from '@web/frontend/assets/index.js';

export type SerialSelectorModalProps = {
  onSelect: (detailedSerial: DetailedSerial) => void;
  open: boolean;
  onClose: () => void;
  initialLocationId?: ID;
  initialCustomerId?: ID;
  initialProductVariantId?: ID;
};

export function SerialSelectorModal({
  initialProductVariantId,
  initialLocationId,
  initialCustomerId,
  onClose,
  open,
  onSelect,
}: SerialSelectorModalProps) {
  const [query, setQuery, optimisticQuery] = useDebouncedState('');
  // TODO: Support these as filters too
  const [locationId, setLocationId] = useState(initialLocationId);
  const [customerId, setCustomerId] = useState(initialCustomerId);
  const [productVariantId, setProductVariantId] = useState(initialProductVariantId);

  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });
  const locationQuery = useLocationQuery({ fetch, id: locationId ?? null });
  const customerQuery = useCustomerQuery({ fetch, id: customerId ?? null });
  const productVariantQuery = useProductVariantQuery({ fetch, id: productVariantId ?? null });
  const serialsQuery = useSerialsQuery({
    fetch,
    params: {
      limit: 25,
      query,
      locationId,
      customerId,
      sort: 'created-at',
      order: 'descending',
    },
  });

  const serials = serialsQuery.data?.pages.flat() ?? [];

  const productVariantIds = unique(serials.map(serial => serial.productVariant.id));
  const productVariantQueries = useProductVariantQueries({ fetch, ids: productVariantIds });

  const [pageIndex, setPageIndex] = useState(0);
  const pagination = getInfiniteQueryPagination(pageIndex, setPageIndex, serialsQuery);
  const page = serialsQuery.data?.pages[pageIndex] ?? [];

  return (
    <Modal open={open} title={'Serials'} onClose={onClose}>
      <ResourceList
        items={page}
        resourceName={{ singular: 'serial', plural: 'serials' }}
        loading={serialsQuery.isFetching}
        pagination={{
          hasNext: pagination.hasNextPage,
          hasPrevious: pagination.hasPreviousPage,
          onNext: pagination.next,
          onPrevious: pagination.previous,
        }}
        emptyState={
          <Card>
            <EmptyState image={emptyState} heading={'Serials'}>
              <Text as={'p'} variant={'bodyMd'}>
                No serials found
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
        renderItem={serial => {
          const productVariant = productVariantQueries[serial.productVariant.id]?.data;

          const imageUrl = productVariant?.image?.url ?? productVariant?.product.featuredImage?.url;
          const label = getProductVariantName(productVariant ?? serial.productVariant) ?? 'Unknown product variant';

          return (
            <ResourceItem
              id={`${serial.productVariant.id}-${serial.serial}`}
              onClick={() => {
                onSelect(serial);
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
                    {serial.serial}
                  </Text>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    {serial.location?.name}
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
