import {
  Banner,
  BlockStack,
  Card,
  Frame,
  IndexFilters,
  IndexFiltersMode,
  IndexTable,
  InlineStack,
  Page,
  SkeletonBodyText,
  SkeletonThumbnail,
  Text,
  Thumbnail,
} from '@shopify/polaris';
import { useToast } from '@teifi-digital/shopify-app-react';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { ReactNode, useState } from 'react';
import { TitleBar } from '@shopify/app-bridge-react';
import { useDebouncedState } from '@web/frontend/hooks/use-debounced-state.js';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { sentenceCase } from '@teifi-digital/shopify-app-toolbox/string';
import { InventoryMutationType } from '@web/services/inventory/queries.js';
import { unique } from '@teifi-digital/shopify-app-toolbox/array';
import { useInventoryItemQueries } from '@work-orders/common/queries/use-inventory-item-query.js';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { useInventoryMutationItemsQuery } from '@work-orders/common/queries/use-inventory-mutation-items-query.js';
import { InventoryMutationItemsPaginationOptions } from '@web/schemas/generated/inventory-mutation-items-pagination-options.js';
import { useLocationQueries } from '@work-orders/common/queries/use-location-query.js';
import { useEmployeeQueries } from '@work-orders/common/queries/use-employee-query.js';
import { isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { getInfiniteQueryPagination } from '@web/frontend/util/pagination.js';
import { IndexTableHeading } from '@shopify/polaris/build/ts/src/components/IndexTable/index.js';

const PAGE_SIZE = 100;

const INVENTORY_QUANTITY_COLUMNS = ['available', 'incoming', 'reserved'] as const;

const MUTATION_VERB: Record<InventoryMutationType, string> = {
  MOVE: 'moved',
  SET: 'set',
  ADJUST: 'adjusted',
};

export default function () {
  return (
    <Frame>
      <Page fullWidth>
        <InventoryLog />
      </Page>
    </Frame>
  );
}

function InventoryLog() {
  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });

  const [mode, setMode] = useState(IndexFiltersMode.Default);
  const [query, setQuery, optimisticQuery] = useDebouncedState('');
  const [options, setOptions] = useState<
    Partial<Omit<InventoryMutationItemsPaginationOptions, 'offset' | 'limit' | 'query'>>
  >({});

  const inventoryMutationItemsQuery = useInventoryMutationItemsQuery(
    {
      fetch,
      options: {
        ...options,
        query,
        limit: PAGE_SIZE,
      },
    },
    { keepPreviousData: true },
  );

  // TODO: Sort
  type HeadingId = { id?: InventoryMutationItemsPaginationOptions['sortMode'] };

  const headings: [IndexTableHeading & HeadingId, ...(IndexTableHeading & HeadingId)[]] = [
    {
      title: 'Date',
      id: 'updatedAt',
    },
    {
      title: 'Trigger',
      id: 'initiatorName',
    },
    {
      title: 'Location',
      id: 'locationId',
    },
    {
      title: 'Staff member',
      id: 'staffMemberId',
    },
    {
      title: 'Image',
      hidden: true,
    },
    {
      title: 'Product variant',
      id: 'inventoryItemId',
    },

    ...INVENTORY_QUANTITY_COLUMNS.map(
      column =>
        ({
          title: sentenceCase(column),
          id: column,
          alignment: 'center',
        }) as const,
    ),
  ];

  const inventoryItemIds = unique(
    inventoryMutationItemsQuery.data?.pages.flatMap(page => page.items).map(item => item.inventoryItemId) ?? [],
  );
  const locationIds = unique(
    inventoryMutationItemsQuery.data?.pages.flatMap(page => page.items).map(item => item.locationId) ?? [],
  );
  const staffMemberIds = unique(
    inventoryMutationItemsQuery.data?.pages
      .flatMap(page => page.items)
      .map(item => item.staffMemberId)
      .filter(isNonNullable) ?? [],
  );

  const inventoryItemsQueries = useInventoryItemQueries({ fetch, ids: inventoryItemIds, locationId: null });
  const locationQueries = useLocationQueries({ fetch, ids: locationIds });
  const staffMemberQueries = useEmployeeQueries({ fetch, ids: staffMemberIds });

  const [pageIndex, setPageIndex] = useState(0);
  const pagination = getInfiniteQueryPagination(pageIndex, setPageIndex, inventoryMutationItemsQuery);

  const page = inventoryMutationItemsQuery.data?.pages[pageIndex]?.items ?? [];

  const rows = (() => {
    const rows: ReactNode[] = [];

    if (!inventoryMutationItemsQuery.data) {
      return rows;
    }

    for (const item of page) {
      const inventoryItemQuery = inventoryItemsQueries[item.inventoryItemId];

      if (inventoryItemQuery?.data) {
        const name = getProductVariantName(inventoryItemQuery.data.variant) ?? 'Unknown product variant';
        const imageUrl =
          inventoryItemQuery.data.variant.image?.url ?? inventoryItemQuery.data.variant.product?.featuredImage?.url;

        const locationQuery = locationQueries[item.locationId];
        const staffMemberQuery = item.staffMemberId ? staffMemberQueries[item.staffMemberId] : null;

        // TODO: Group by Type + Date
        rows.push(
          <IndexTable.Row key={item.id} id={item.id.toString()} selected={false} position={rows.length}>
            <IndexTable.Cell>{item.updatedAt.toLocaleString()}</IndexTable.Cell>
            <IndexTable.Cell>{item.initiatorName}</IndexTable.Cell>
            <IndexTable.Cell>
              {!locationQuery?.data ? <SkeletonBodyText lines={1} /> : locationQuery.data.name}
            </IndexTable.Cell>
            <IndexTable.Cell>
              {!!item.staffMemberId && !staffMemberQuery?.data && <SkeletonBodyText lines={1} />}
              {!!item.staffMemberId && staffMemberQuery?.data && staffMemberQuery.data.name}
            </IndexTable.Cell>
            <IndexTable.Cell>
              {!imageUrl && <SkeletonThumbnail size="small" />}
              {!!imageUrl && <Thumbnail alt={name} source={imageUrl} size="small" />}
            </IndexTable.Cell>
            <IndexTable.Cell>
              <Text as="p" variant="bodyMd" fontWeight="bold">
                {name}
              </Text>
            </IndexTable.Cell>

            {INVENTORY_QUANTITY_COLUMNS.map(quantityName => {
              if (item.name !== quantityName) {
                return <IndexTable.Cell key={quantityName}></IndexTable.Cell>;
              }

              return (
                <IndexTable.Cell key={quantityName}>
                  {item.type === 'SET' && (
                    <InlineStack align="center" gap="050">
                      <Text as="p" variant="bodyMd" tone="subdued">
                        =
                      </Text>
                      <Text as="p" variant="bodyMd" numeric>
                        {item.quantity}
                      </Text>
                    </InlineStack>
                  )}

                  {item.type == 'ADJUST' && (
                    <InlineStack align="center" gap="050">
                      <Text as="p" variant="bodyMd" tone="subdued">
                        {(item.delta ?? 0) >= 0 ? '+' : '-'}
                      </Text>
                      <Text as="p" variant="bodyMd" numeric>
                        {Math.abs(item.delta ?? 0)}
                      </Text>
                    </InlineStack>
                  )}

                  {item.type == 'MOVE' && (
                    <InlineStack align="center" gap="050">
                      <Text as="p" variant="bodyMd" tone="subdued">
                        {(item.quantity ?? 0) >= 0 ? '+' : '-'}
                      </Text>
                      <Text as="p" variant="bodyMd" numeric>
                        {Math.abs(item.quantity ?? 0)}
                      </Text>
                    </InlineStack>
                  )}
                </IndexTable.Cell>
              );
            })}
          </IndexTable.Row>,
        );
      } else {
        rows.push(
          <IndexTable.Row key={item.id} id={item.id.toString()} selected={false} position={rows.length}>
            <IndexTable.Cell>
              <SkeletonThumbnail size="small" />
            </IndexTable.Cell>
            <IndexTable.Cell>
              <SkeletonBodyText lines={1} />
            </IndexTable.Cell>

            {INVENTORY_QUANTITY_COLUMNS.map(quantityName => {
              return (
                <IndexTable.Cell key={quantityName}>
                  <SkeletonBodyText lines={1} />
                </IndexTable.Cell>
              );
            })}
          </IndexTable.Row>,
        );
      }
    }

    return rows;
  })();

  return (
    <Card>
      <TitleBar title="Inventory log" />

      <BlockStack gap="200">
        <BlockStack>
          <Text as="h1" variant="headingMd" fontWeight="bold">
            Inventory log
          </Text>

          <Text as="p" variant="bodyMd" tone="subdued">
            View and control changes made by WorkMate to the Shopify inventory
          </Text>
        </BlockStack>

        {inventoryMutationItemsQuery.isError && (
          <Banner
            title="Error loading inventory mutations"
            tone="critical"
            action={{
              content: 'Retry',
              loading: inventoryMutationItemsQuery.isFetching,
              onAction: () => inventoryMutationItemsQuery.refetch(),
            }}
          >
            {extractErrorMessage(inventoryMutationItemsQuery.error, 'An error occurred while inventory mutations')}
          </Banner>
        )}
      </BlockStack>

      <IndexFilters
        canCreateNewView={false}
        mode={mode}
        setMode={setMode}
        filters={[]}
        onQueryChange={setQuery}
        onQueryClear={() => setQuery('', true)}
        onClearAll={() => setQuery('', true)}
        queryValue={optimisticQuery}
        queryPlaceholder="Search product variants"
        tabs={[]}
        selected={0}
        loading={inventoryMutationItemsQuery.isFetching}
      />

      <IndexTable
        headings={[...headings]}
        itemCount={rows.length}
        sortable={headings.map(heading => !!heading.id)}
        resourceName={{
          singular: 'inventory mutation',
          plural: 'inventory mutations',
        }}
        loading={inventoryMutationItemsQuery.isFetching}
        selectable={false}
        pagination={{
          hasNext: pagination.hasNextPage,
          onNext: pagination.next,
          hasPrevious: pagination.hasPreviousPage,
          onPrevious: pagination.previous,
        }}
        sortColumnIndex={headings.findIndex(heading => heading.id === options.sortMode)}
        sortDirection={options.sortOrder}
        onSort={(headingIndex, sortOrder) => {
          const sortMode = headings[headingIndex]?.id;

          if (!sortMode) {
            return;
          }

          setOptions(current => ({ ...current, sortOrder, sortMode }));
        }}
      >
        {rows}

        {inventoryMutationItemsQuery.isLoading &&
          Array.from({ length: PAGE_SIZE }, (_, i) => (
            <IndexTable.Row key={i} id={String(i)} selected={false} position={i}>
              <IndexTable.Cell>
                <SkeletonBodyText lines={1} />
              </IndexTable.Cell>

              <IndexTable.Cell>
                <SkeletonBodyText lines={1} />
              </IndexTable.Cell>

              <IndexTable.Cell>
                <SkeletonBodyText lines={1} />
              </IndexTable.Cell>

              <IndexTable.Cell>
                <SkeletonThumbnail size="small" />
              </IndexTable.Cell>

              <IndexTable.Cell>
                <SkeletonBodyText lines={1} />
              </IndexTable.Cell>

              {INVENTORY_QUANTITY_COLUMNS.map(quantityName => {
                return (
                  <IndexTable.Cell key={quantityName}>
                    <SkeletonBodyText lines={1} />
                  </IndexTable.Cell>
                );
              })}
            </IndexTable.Row>
          ))}
      </IndexTable>

      {toast}
    </Card>
  );
}
