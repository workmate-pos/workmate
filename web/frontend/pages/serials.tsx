import { useState } from 'react';
import { ID, parseGid } from '@teifi-digital/shopify-app-toolbox/shopify';
import { SerialSortColumn, SerialSortOrder } from '@web/schemas/generated/serial-pagination-options.js';
import { useDebouncedState } from '@web/frontend/hooks/use-debounced-state.js';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { useToast } from '@teifi-digital/shopify-app-react';
import { useSerialsQuery } from '@work-orders/common/queries/use-serials-query.js';
import {
  Card,
  EmptyState,
  Frame,
  IndexFilters,
  IndexFiltersMode,
  IndexTable,
  Link,
  Page,
  SkeletonThumbnail,
  Text,
  Thumbnail,
} from '@shopify/polaris';
import { useProductVariantQueries } from '@work-orders/common/queries/use-product-variant-query.js';
import { unique } from '@teifi-digital/shopify-app-toolbox/array';
import { getInfiniteQueryPagination } from '@web/frontend/util/pagination.js';
import { emptyState } from '@web/frontend/assets/index.js';
import { TitleBar, useAppBridge } from '@shopify/app-bridge-react';
import { Redirect } from '@shopify/app-bridge/actions';
import { ProductVariantSelectorModal } from '@web/frontend/components/selectors/ProductVariantSelectorModal.js';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { LocationSelectorModal } from '@web/frontend/components/shared-orders/modals/LocationSelectorModal.js';

export default function Serials() {
  const [query, setQuery, optimisticQuery] = useDebouncedState('');
  const [locationId, setLocationId] = useState<ID>();
  const [customerId, setCustomerId] = useState<ID>();
  const [productVariantId, setProductVariantId] = useState<ID>();
  const [sort, setSort] = useState<SerialSortColumn>('created-at');
  const [order, setOrder] = useState<SerialSortOrder>('descending');

  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });
  const serialsQuery = useSerialsQuery({ fetch, params: { limit: 25, query, locationId, customerId, sort, order } });
  const serials = serialsQuery.data?.pages.flat() ?? [];

  const productVariantIds = unique(serials.map(serial => serial.productVariant.id));
  const productVariantQueries = useProductVariantQueries({ fetch, ids: productVariantIds });

  const [pageIndex, setPageIndex] = useState(0);
  const pagination = getInfiniteQueryPagination(pageIndex, setPageIndex, serialsQuery);

  const app = useAppBridge();
  const redirectToSerial = (productVariantId: ID, serial: string) => {
    Redirect.create(app).dispatch(
      Redirect.Action.APP,
      `/serial/${parseGid(productVariantId).id}/${encodeURIComponent(serial)}`,
    );
  };

  const [isProductSelectorOpen, setIsProductSelectorOpen] = useState(false);
  const [isLocationSelectorOpen, setIsLocationSelectorOpen] = useState(false);
  const [mode, setMode] = useState<IndexFiltersMode>(IndexFiltersMode.Default);

  return (
    <Frame>
      <Page>
        <ProductVariantSelectorModal
          onSelect={pv => redirectToSerial(pv.id, 'new')}
          open={isProductSelectorOpen}
          onClose={() => setIsProductSelectorOpen(false)}
        />

        <LocationSelectorModal
          open={isLocationSelectorOpen}
          onClose={() => setIsLocationSelectorOpen(false)}
          onSelect={locationId => setLocationId(locationId)}
          setToastAction={setToastAction}
        />

        <TitleBar
          title="Serial"
          primaryAction={{
            content: 'New Serial',
            onAction: () => setIsProductSelectorOpen(true),
          }}
        />

        <IndexFilters
          mode={mode}
          setMode={setMode}
          filters={[]}
          onQueryChange={query => setQuery(query, !query)}
          onQueryClear={() => setQuery('', true)}
          onClearAll={() => {
            setQuery('', true);
            setLocationId(undefined);
            setCustomerId(undefined);
            setProductVariantId(undefined);
          }}
          queryValue={optimisticQuery}
          queryPlaceholder={'Search serials'}
          tabs={[]}
          selected={0}
        />
        <IndexTable
          headings={[
            { title: 'Image', hidden: true, flush: true },
            { title: 'Product', alignment: 'start' },
            { title: 'Serial', alignment: 'start' },
            { title: 'Location', alignment: 'start' },
          ]}
          itemCount={serials.length}
          hasMoreItems={serialsQuery.hasNextPage}
          pagination={{
            hasNext: pagination.hasNextPage,
            hasPrevious: pagination.hasPreviousPage,
            onNext: pagination.next,
            onPrevious: pagination.previous,
          }}
          resourceName={{ singular: 'serial', plural: 'serials' }}
          emptyState={
            <Card>
              <EmptyState
                heading="Serials"
                image={emptyState}
                action={{
                  content: 'Create',
                  onAction: () => setIsProductSelectorOpen(true),
                }}
              >
                <Text as="p" variant="bodyMd">
                  No serials found
                </Text>
              </EmptyState>
            </Card>
          }
          loading={serialsQuery.isFetching}
          selectable={false}
        >
          {serials.map((serial, i) => {
            const productVariant = productVariantQueries[serial.productVariant.id]?.data;

            const imageUrl = productVariant?.image?.url ?? productVariant?.product?.featuredImage?.url;
            const label =
              getProductVariantName(productVariantQueries[serial.productVariant.id]?.data) ?? 'Unknown product';

            return (
              <IndexTable.Row
                id={`${serial.productVariant.id}-${serial.serial}`}
                position={i}
                key={`${serial.productVariant.id}-${serial.serial}`}
              >
                <IndexTable.Cell>
                  {imageUrl && <Thumbnail source={imageUrl} alt={label} size="small" />}
                  {!imageUrl && <SkeletonThumbnail size="small" />}
                </IndexTable.Cell>
                <IndexTable.Cell>
                  <Link
                    dataPrimaryLink
                    url={`/serial/${parseGid(serial.productVariant.id).id}/${encodeURIComponent(serial.serial)}`}
                  >
                    <Text as="p" variant="bodyMd" fontWeight="bold">
                      {label}
                    </Text>
                  </Link>
                </IndexTable.Cell>
                <IndexTable.Cell>{serial.serial}</IndexTable.Cell>
                <IndexTable.Cell>{serial.location?.name}</IndexTable.Cell>
              </IndexTable.Row>
            );
          })}
        </IndexTable>

        {toast}
      </Page>
    </Frame>
  );
}
