import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { useToast } from '@teifi-digital/shopify-app-react';
import { useDebouncedState } from '@web/frontend/hooks/use-debounced-state.js';
import { useSerialsQuery } from '@work-orders/common/queries/use-serials-query.js';
import { useState } from 'react';
import { getInfiniteQueryPagination } from '@web/frontend/util/pagination.js';
import {
  Badge,
  BlockStack,
  Box,
  Card,
  Checkbox,
  EmptyState,
  Filters,
  InlineStack,
  Modal,
  ResourceItem,
  ResourceList,
  SkeletonBodyText,
  SkeletonThumbnail,
  Text,
  Thumbnail,
} from '@shopify/polaris';
import { emptyState } from '@web/frontend/assets/index.js';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { useProductVariantQuery } from '@work-orders/common/queries/use-product-variant-query.js';
import { useSerialQuery } from '@work-orders/common/queries/use-serial-query.js';
import { useLocationQuery } from '@work-orders/common/queries/use-location-query.js';

export type ProductVariantSerialSelectorModalProps = {
  onSelect: (serial: string, productVariantId: ID) => void;
  open: boolean;
  onClose: () => void;
  filters?: {
    productVariantId?: ID;
    locationId?: ID;
    customerId?: ID;
    /**
     * If undefined, all serials will be shown.
     * If true, only sold serials will be shown.
     * If false, only unsold serials will be shown.
     *
     * In all cases, sold serials are shown last.
     * Serial status is shown in a badge.
     */
    sold?: boolean;
  };
};

/**
 * Pick a serial for some serialized product variant.
 * Only shows serials for one product variant (should be picked with {@link ProductVariantSelectorModal}).
 */
export function ProductVariantSerialSelectorModal({
  onSelect,
  open,
  onClose,
  filters,
}: ProductVariantSerialSelectorModalProps) {
  // TODO: Ability to override these filters

  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });
  const [query, setQuery, optimisticQuery] = useDebouncedState('');

  const [sold, setSold] = useState(filters?.sold);

  const productVariantSerialsQuery = useSerialsQuery({
    fetch,
    params: {
      query,
      productVariantId: filters?.productVariantId,
      locationId: filters?.locationId,
      customerId: filters?.customerId,
      sold,
      limit: 100,
    },
    options: {
      enabled: open,
    },
  });

  const [pageIndex, setPageIndex] = useState(0);
  const pagination = getInfiniteQueryPagination(pageIndex, setPageIndex, productVariantSerialsQuery);
  const allPages = productVariantSerialsQuery.data?.pages.flat() ?? [];
  const page = productVariantSerialsQuery.data?.pages[pageIndex] ?? [];

  return (
    <>
      <Modal open={open} title={'Product variants'} onClose={onClose}>
        <ResourceList
          items={page}
          resourceName={{ singular: 'serial', plural: 'serials' }}
          loading={productVariantSerialsQuery.isFetching}
          totalItemsCount={allPages.length}
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
            <Filters
              queryValue={optimisticQuery}
              appliedFilters={[
                ...(sold !== false
                  ? [
                      {
                        key: 'show-sold',
                        label: 'Showing sold serials',
                        onRemove: () => setSold(!filters?.sold ? filters?.sold : false),
                      },
                    ]
                  : []),
              ]}
              filters={[
                {
                  key: 'sold',
                  label: 'Show sold',
                  shortcut: true,
                  filter: (
                    <Checkbox
                      label="Show sold serials"
                      checked={sold !== false}
                      onChange={showSoldSerials => {
                        if (showSoldSerials) {
                          setSold(undefined);
                        } else {
                          // if filters has a default falsy value we fall back to that (either undefined or false)
                          setSold(!filters?.sold ? filters?.sold : false);
                        }
                      }}
                    />
                  ),
                },
              ]}
              onQueryChange={query => setQuery(query, !query)}
              onQueryClear={() => setQuery('', true)}
              onClearAll={() => setQuery('', true)}
            />
          }
          renderItem={serial => (
            <SerialResourceItem
              productVariantId={serial.productVariant.id}
              serialNumber={serial.serial}
              onClick={() => onSelect(serial.serial, serial.productVariant.id)}
            />
          )}
        />

        {toast}
      </Modal>
      {toast}
    </>
  );
}

function SerialResourceItem({
  serialNumber,
  productVariantId,
  onClick,
}: {
  serialNumber: string;
  productVariantId: ID;
  onClick: () => void;
}) {
  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });

  const serialQuery = useSerialQuery({ fetch, serial: serialNumber, productVariantId });
  const serial = serialQuery.data;

  const productVariantQuery = useProductVariantQuery({ fetch, id: productVariantId });
  const productVariant = productVariantQuery.data;

  const locationQuery = useLocationQuery({ fetch, id: serial?.location?.id ?? null });
  const location = locationQuery.data;

  const labelText = productVariant ? (
    <Text as="p" variant="bodyMd" fontWeight="bold">
      {getProductVariantName(productVariant) ?? 'Unknown product variant'}
    </Text>
  ) : (
    <SkeletonBodyText lines={1} />
  );

  const skuText = productVariant ? (
    !!productVariant.sku && (
      <Text as="p" variant="bodyMd" tone="subdued">
        {productVariant.sku}
      </Text>
    )
  ) : (
    <SkeletonBodyText lines={1} />
  );

  const imageUrl = productVariant?.image?.url ?? productVariant?.product.featuredImage?.url;
  const image = imageUrl ? (
    <Thumbnail source={imageUrl} alt={getProductVariantName(productVariant) ?? 'Unknown product variant'} />
  ) : (
    <SkeletonThumbnail />
  );

  const soldBadge = !serial ? null : !serial.sold ? (
    <Box>
      <Badge tone="success">Available</Badge>
    </Box>
  ) : (
    <Box>
      {' '}
      <Badge tone="critical">Sold</Badge>
    </Box>
  );

  const locationText = location ? (
    <Text as="p" variant="bodyMd">
      {location.name}
    </Text>
  ) : (
    <SkeletonBodyText lines={1} />
  );

  const serialText = serial ? (
    <Text as="p" variant="bodyMd">
      {serial.serial}
    </Text>
  ) : (
    <SkeletonBodyText lines={1} />
  );

  return (
    <ResourceItem id={`${productVariantId}-${serialNumber}`} onClick={onClick}>
      <InlineStack align="space-between" blockAlign="center">
        <InlineStack gap="400">
          {image}

          <BlockStack gap="050">
            {labelText}
            {serialText}
            {skuText}
            {locationText}
          </BlockStack>
        </InlineStack>

        {soldBadge}
      </InlineStack>

      {toast}
    </ResourceItem>
  );
}
