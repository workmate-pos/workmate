import {
  Banner,
  BlockStack,
  Box,
  Card,
  Frame,
  Image,
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
import { useInventoryMutationsQuery } from '@work-orders/common/queries/use-inventory-mutations-query.js';
import { ReactNode, useMemo, useState } from 'react';
import { InventoryPaginationOptions } from '@web/schemas/generated/inventory-pagination-options.js';
import { TitleBar } from '@shopify/app-bridge-react';
import { useDebouncedState } from '@web/frontend/hooks/use-debounced-state.js';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { useAllLocationsQuery } from '@work-orders/common/queries/use-all-locations-query.js';
import { sentenceCase } from '@teifi-digital/shopify-app-toolbox/string';
import { InventoryMutationType } from '@web/services/inventory/queries.js';
import { unique } from '@teifi-digital/shopify-app-toolbox/array';
import { useInventoryItemQueries } from '@work-orders/common/queries/use-inventory-item-query.js';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';

const PAGE_SIZE = 100;

const INVENTORY_QUANTITY_COLUMNS = ['available', 'incoming', 'reserved'];

const MUTATION_VERB: Record<InventoryMutationType, string> = {
  MOVE: 'moved',
  SET: 'set',
  ADJUST: 'adjusted',
};

export default function () {
  return (
    <Frame>
      <Page>
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
  const [options, setOptions] = useState<Partial<Omit<InventoryPaginationOptions, 'offset' | 'limit' | 'query'>>>({});

  const locationsQuery = useAllLocationsQuery({ fetch });
  const inventoryMutationsQuery = useInventoryMutationsQuery({
    fetch,
    options: {
      ...options,
      query,
      limit: PAGE_SIZE,
    },
  });

  const headings = [
    {
      title: 'Date',
    },
    {
      title: 'Image',
      hidden: true,
    },
    {
      title: 'Product variant',
    },

    ...INVENTORY_QUANTITY_COLUMNS.map(
      column =>
        ({
          title: sentenceCase(column),
          alignment: 'center',
        }) as const,
    ),
  ] as const;

  const inventoryItemIds = unique(
    inventoryMutationsQuery.data?.pages
      .flatMap(page => page.mutations)
      .flatMap(mutation => mutation.items)
      .map(item => item.inventoryItemId) ?? [],
  );
  const inventoryItemsQueries = useInventoryItemQueries({ fetch, ids: inventoryItemIds, locationId: null });

  const rows = (() => {
    const rows: ReactNode[] = [];

    if (!inventoryMutationsQuery.data) {
      return rows;
    }

    for (const page of inventoryMutationsQuery.data.pages) {
      for (const mutation of page.mutations) {
        rows.push(
          <IndexTable.Row
            rowType="subheader"
            key={mutation.id}
            id={mutation.id.toString()}
            selected={false}
            position={rows.length}
          >
            <IndexTable.Cell as="th" colSpan={1}>
              {mutation.createdAt.toLocaleString()}
            </IndexTable.Cell>
            <IndexTable.Cell as="th" colSpan={headings.length - 1}>
              {sentenceCase(mutation.initiatorType)} {mutation.initiatorName} {MUTATION_VERB[mutation.type]}
            </IndexTable.Cell>
          </IndexTable.Row>,
        );

        for (const item of mutation.items) {
          const inventoryItemQuery = inventoryItemsQueries[item.inventoryItemId];

          if (inventoryItemQuery?.data) {
            const name = getProductVariantName(inventoryItemQuery.data.variant) ?? 'Unknown product variant';
            const imageUrl =
              inventoryItemQuery.data.variant.image?.url ?? inventoryItemQuery.data.variant.product?.featuredImage?.url;

            const addPrefix = (quantity: number): ReactNode => {
              if (mutation.type === 'MOVE' || mutation.type === 'ADJUST') {
                return (
                  <InlineStack align="center" gap="050">
                    <Text as="p" variant="bodyMd" tone="subdued">
                      {quantity >= 0 ? '+' : ''}
                    </Text>
                    <Text as="p" variant="bodyMd" numeric>
                      {quantity}
                    </Text>
                  </InlineStack>
                );
              }

              if (mutation.type === 'SET') {
                return (
                  <InlineStack align="center" gap="050">
                    <Text as="p" variant="bodyMd" tone="subdued">
                      =
                    </Text>
                    <Text as="p" variant="bodyMd" numeric>
                      {quantity}
                    </Text>
                  </InlineStack>
                );
              }

              return mutation.type satisfies never;
            };

            // TODO: Group by Type + Date
            rows.push(
              <IndexTable.Row key={item.id} id={item.id.toString()} selected={false} position={rows.length}>
                <IndexTable.Cell>{item.updatedAt.toLocaleString()}</IndexTable.Cell>
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
                  return (
                    <IndexTable.Cell key={quantityName}>
                      {item.name === quantityName
                        ? addPrefix(mutation.items.find(item => item.name === quantityName)?.quantity ?? 0)
                        : null}
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

        {locationsQuery.isError && (
          <Box paddingBlock="200">
            <Banner
              title="Error loading locations"
              tone="critical"
              action={{
                content: 'Retry',
                onAction: () => locationsQuery.refetch(),
              }}
            >
              {extractErrorMessage(locationsQuery.error, 'An error occurred while loading locations')}
            </Banner>
          </Box>
        )}

        {inventoryMutationsQuery.isError && (
          <Banner
            title="Error loading locations"
            tone="critical"
            action={{
              content: 'Retry',
              onAction: () => inventoryMutationsQuery.refetch(),
            }}
          >
            {extractErrorMessage(inventoryMutationsQuery.error, 'An error occurred while inventory mutations')}
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
        queryValue={query}
        queryPlaceholder="Search product variants"
        tabs={[
          {
            id: 'all',
            content: 'All locations',
            selected: !options.locationId,
            onAction: () => setOptions(options => ({ ...options, locationId: undefined })),
          },
          ...(locationsQuery.data?.map(location => ({
            id: location.id,
            content: location.name,
            selected: location.id === options.locationId,
            onAction: () => setOptions(options => ({ ...options, locationId: location.id })),
          })) ?? []),
        ]}
        selected={
          !options.locationId
            ? 0
            : 1 + (locationsQuery.data?.findIndex(location => location.id === options.locationId) ?? -1)
        }
        loading={locationsQuery.isFetching}
      />

      <IndexTable
        headings={[...headings]}
        itemCount={rows.length}
        resourceName={{
          singular: 'inventory mutation',
          plural: 'inventory mutations',
        }}
        loading={inventoryMutationsQuery.isLoading}
        selectable={false}
      >
        {rows}

        {inventoryMutationsQuery.isLoading &&
          Array.from({ length: PAGE_SIZE }, (_, i) => (
            <IndexTable.Row key={i} id={String(i)} selected={false} position={i}>
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
