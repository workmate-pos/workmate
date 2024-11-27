import { PermissionBoundary } from '@web/frontend/components/PermissionBoundary.js';
import {
  Badge,
  Box,
  EmptyState,
  Frame,
  IndexFilters,
  IndexFiltersMode,
  IndexTable,
  LegacyCard,
  Page,
  Text,
  useIndexResourceState,
} from '@shopify/polaris';
import { emptyState } from '@web/frontend/assets/index.js';
import { useDebouncedState } from '@web/frontend/hooks/use-debounced-state.js';
import { useEffect, useState } from 'react';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { useToast } from '@teifi-digital/shopify-app-react';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { useSpecialOrdersQuery } from '@work-orders/common/queries/use-special-orders-query.js';
import { getInfiniteQueryPagination } from '@web/frontend/util/pagination.js';
import { useLocationsQuery } from '@work-orders/common/queries/use-locations-query.js';
import { sum, unique } from '@teifi-digital/shopify-app-toolbox/array';
import { hasNonNullableProperty, isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { useProductVariantQueries } from '@work-orders/common/queries/use-product-variant-query.js';
import { usePurchaseOrderMutation } from '@work-orders/common/queries/use-purchase-order-mutation.js';
import { useSettingsQuery } from '@work-orders/common/queries/use-settings-query.js';
import { useCustomFieldsPresetsQuery } from '@work-orders/common/queries/use-custom-fields-presets-query.js';
import { Redirect } from '@shopify/app-bridge/actions';
import { TitleBar, useAppBridge } from '@shopify/app-bridge-react';
import { sentenceCase } from '@teifi-digital/shopify-app-toolbox/string';
import { useVendorsQuery } from '@work-orders/common/queries/use-vendors-query.js';
import { getCreatePurchaseOrderForSpecialOrders } from '@work-orders/common/create-purchase-order/from-special-orders.js';
import { useSuppliersQuery } from '@work-orders/common/queries/use-suppliers-query.js';

export default function () {
  return (
    <Frame>
      <Page>
        <PermissionBoundary permissions={['read_special_orders', 'write_purchase_orders', 'read_settings']}>
          <Merge />
        </PermissionBoundary>
      </Page>
    </Frame>
  );
}

function Merge() {
  const app = useAppBridge();

  const [query, setQuery, optimisticQuery] = useDebouncedState('');
  const [locationId, setLocationId] = useState<ID>();
  const [supplierId, setSupplierId] = useState<number>();

  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });

  const vendorsQuery = useVendorsQuery({
    fetch,
    filters: {
      specialOrderLocationId: locationId,
      specialOrderLineItemOrderState: 'not-fully-ordered',
    },
  });

  const suppliersQuery = useSuppliersQuery({
    fetch,
    params: {
      limit: 100,
      vendor: vendorsQuery.data?.flat().map(vendor => vendor.name) ?? [],
    },
  });

  useEffect(() => {
    if (!suppliersQuery.isFetching && suppliersQuery.hasNextPage) {
      suppliersQuery.fetchNextPage();
    }
  }, [suppliersQuery.isFetching, suppliersQuery.hasNextPage]);

  const suppliers = suppliersQuery.data?.pages.flatMap(page => page.suppliers) ?? [];

  const locationsQuery = useLocationsQuery({ fetch, params: {} });
  const specialOrdersQuery = useSpecialOrdersQuery({
    fetch,
    params: {
      query,
      locationId,
      lineItemVendorName: suppliers
        .filter(supplier => supplier.id === supplierId)
        .flatMap(supplier => supplier.vendors),
      lineItemOrderState: 'not-fully-ordered',
      limit: 25,
    },
  });

  const settingsQuery = useSettingsQuery({ fetch });
  const purchaseOrderCustomFieldsPresetsQuery = useCustomFieldsPresetsQuery({ fetch, type: 'PURCHASE_ORDER' });
  const lineItemCustomFieldsPresetsQuery = useCustomFieldsPresetsQuery({ fetch, type: 'LINE_ITEM' });

  const purchaseOrderMutation = usePurchaseOrderMutation({ fetch });

  const productVariantIds = unique(
    specialOrdersQuery.data?.pages
      .flat()
      .flatMap(specialOrder => specialOrder.lineItems)
      .map(lineItem => lineItem.productVariantId) ?? [],
  );
  const productVariantQueries = useProductVariantQueries({ fetch, ids: productVariantIds });

  useEffect(() => {
    if (!locationsQuery.isFetching && locationsQuery.hasNextPage) {
      locationsQuery.fetchNextPage();
    }
  }, [locationsQuery.isFetching, locationsQuery.hasNextPage]);

  const locations = locationsQuery.data?.pages.flat() ?? [];

  const [pageIndex, setPageIndex] = useState(0);
  const pagination = getInfiniteQueryPagination(pageIndex, setPageIndex, specialOrdersQuery);
  const page = specialOrdersQuery.data?.pages[pageIndex] ?? [];

  const { allResourcesSelected, clearSelection, selectedResources, handleSelectionChange } = useIndexResourceState(
    specialOrdersQuery.data?.pages.flat() ?? [],
    {
      resourceIDResolver: specialOrder => specialOrder.name,
    },
  );

  return (
    <LegacyCard>
      <TitleBar
        title="Merge special orders"
        primaryAction={{
          content: 'Merge',
          disabled: selectedResources.length === 0 || !locationId || !supplierId || purchaseOrderMutation.isPending,
          loading: purchaseOrderMutation.isPending,
          onAction: () => {
            if (!locationId || !supplierId) {
              return;
            }

            const status = settingsQuery.data?.settings.purchaseOrders.defaultStatus;
            const purchaseOrderCustomFields = purchaseOrderCustomFieldsPresetsQuery.data?.defaultCustomFields;
            const lineItemCustomFields = lineItemCustomFieldsPresetsQuery.data?.defaultCustomFields;

            if (!status || !purchaseOrderCustomFields || !lineItemCustomFields) {
              setToastAction({ content: 'Settings not loaded, please try again' });
              return;
            }

            const location = locations.find(location => location.id === locationId);

            if (!location) {
              setToastAction({ content: 'Location not found' });
              return;
            }

            const selectedSpecialOrders = selectedResources
              .map(name => specialOrdersQuery.data?.pages.flat().find(specialOrder => specialOrder.name === name))
              .filter(isNonNullable);

            if (selectedSpecialOrders.length !== selectedResources.length) {
              setToastAction({ content: 'Some special orders are missing, please try again' });
              return;
            }

            const createPurchaseOrder = getCreatePurchaseOrderForSpecialOrders({
              location,
              supplierId,
              status,
              purchaseOrderCustomFields,
              lineItemCustomFields,
              productVariants: Object.fromEntries(
                Object.values(productVariantQueries)
                  .filter(hasNonNullableProperty('data'))
                  .map(query => [query.data.id, query.data]),
              ),
              specialOrders: selectedSpecialOrders,
            });

            if (createPurchaseOrder.lineItems.length === 0) {
              setToastAction({ content: 'Cannot merge special orders - no line items found' });
              return;
            }

            setToastAction({ content: 'Merging special orders...' });
            purchaseOrderMutation.mutate(createPurchaseOrder, {
              onSuccess({ purchaseOrder }) {
                setToastAction({ content: `Saved purchase order ${purchaseOrder.name}` });
                Redirect.create(app).dispatch(
                  Redirect.Action.APP,
                  `/purchase-orders/${encodeURIComponent(purchaseOrder.name)}`,
                );
              },
            });
          },
        }}
      />

      <Box paddingInline="600" paddingBlockStart="600" paddingBlockEnd="200">
        <Text as="h2" variant="headingMd" fontWeight="bold">
          Merge Special orders
        </Text>
        <Text as="p" variant="bodyMd">
          Combine special orders into a single purchase order by selecting the location and vendor you want to create a
          purchase order for.
        </Text>
      </Box>

      <IndexFilters
        mode={IndexFiltersMode.Default}
        setMode={() => {}}
        canCreateNewView={false}
        onQueryChange={() => {}}
        onQueryClear={() => {}}
        onClearAll={() => {}}
        filters={[]}
        loading={locationsQuery.isFetching}
        tabs={[
          {
            id: 'All',
            content: 'All locations',
            onAction: () => {
              setLocationId(undefined);
              clearSelection();
            },
          },
          ...locations.map(location => ({
            id: location.id,
            content: location.name,
            onAction: () => {
              setLocationId(location.id);
              clearSelection();
            },
          })),
        ]}
        selected={locations.findIndex(location => location.id === locationId) + 1}
        hideFilters
        hideQueryField
      />

      <IndexFilters
        mode={IndexFiltersMode.Default}
        filters={[]}
        hideFilters
        hideQueryField
        onQueryChange={() => {}}
        onQueryClear={() => {}}
        onClearAll={() => {}}
        setMode={() => {}}
        canCreateNewView={false}
        loading={vendorsQuery.isFetching}
        tabs={[
          {
            id: 'All',
            content: 'All suppliers',
            onAction: () => {
              setSupplierId(undefined);
              clearSelection();
            },
          },
          ...suppliers.map(supplier => ({
            id: String(supplier.id),
            content: supplier.name,
            onAction: () => {
              setSupplierId(supplier.id);
              clearSelection();
            },
          })),
        ]}
        selected={suppliers.findIndex(supplier => supplier.id === supplierId) + 1}
      />

      <IndexFilters
        mode={IndexFiltersMode.Filtering}
        setMode={() => {}}
        filters={[]}
        onQueryChange={query => setQuery(query, !query)}
        onQueryClear={() => setQuery('', true)}
        onClearAll={() => {
          setQuery('', true);
          setLocationId(undefined);
          setSupplierId(undefined);
        }}
        queryValue={optimisticQuery}
        queryPlaceholder={'Search special orders'}
        tabs={[]}
        selected={0}
      />

      <IndexTable
        headings={[
          { title: 'Special order' },
          { title: 'Order state' },
          { title: 'PO state' },
          { title: 'Location' },
          { title: 'Customer' },
          { title: 'Required by' },
          { title: 'PO #' },
          { title: 'SO #' },
          { title: 'WO #' },
        ]}
        selectable={!!locationId && !!supplierId}
        selectedItemsCount={allResourcesSelected ? 'All' : selectedResources.length}
        itemCount={sum(specialOrdersQuery.data?.pages.flatMap(page => page.length) ?? [])}
        loading={
          specialOrdersQuery.isLoading ||
          Object.values(productVariantQueries).some(query => query.isLoading) ||
          purchaseOrderMutation.isPending ||
          settingsQuery.isLoading ||
          purchaseOrderCustomFieldsPresetsQuery.isLoading ||
          lineItemCustomFieldsPresetsQuery.isLoading
        }
        emptyState={
          <EmptyState heading={'Special orders'} image={emptyState}>
            {page.length === 0 && 'No special orders found'}
          </EmptyState>
        }
        pagination={{
          hasNext: pagination.hasNextPage,
          hasPrevious: pagination.hasPreviousPage,
          onPrevious: () => pagination.previous(),
          onNext: () => pagination.next(),
        }}
        resourceName={{ singular: 'special order', plural: 'special orders' }}
        onSelectionChange={handleSelectionChange}
      >
        {page.map((specialOrder, i) => (
          <IndexTable.Row
            key={specialOrder.name}
            id={specialOrder.name}
            selected={selectedResources.includes(specialOrder.name)}
            position={i}
          >
            <IndexTable.Cell>
              <Text as={'p'} fontWeight={'bold'} variant="bodyMd">
                {specialOrder.name}
              </Text>
            </IndexTable.Cell>
            <IndexTable.Cell>
              <Badge tone={'info'}>{sentenceCase(specialOrder.orderState)}</Badge>
            </IndexTable.Cell>
            <IndexTable.Cell>
              {specialOrder.purchaseOrders.length > 0 && (
                <Badge tone={'info'}>{sentenceCase(specialOrder.purchaseOrderState)}</Badge>
              )}
            </IndexTable.Cell>
            <IndexTable.Cell>
              <Text as={'p'} variant="bodyMd">
                {specialOrder.location?.name}
              </Text>
            </IndexTable.Cell>
            <IndexTable.Cell>
              <Text as={'p'} variant="bodyMd">
                {specialOrder.customer.displayName}
              </Text>
            </IndexTable.Cell>
            <IndexTable.Cell>
              <Text as={'p'} variant="bodyMd">
                {specialOrder.requiredBy ? new Date(specialOrder.requiredBy).toLocaleDateString() : ''}
              </Text>
            </IndexTable.Cell>
            <IndexTable.Cell>
              <Text as={'p'} variant="bodyMd">
                {specialOrder.purchaseOrders.map(order => order.name).join(', ')}
              </Text>
            </IndexTable.Cell>
            <IndexTable.Cell>
              <Text as={'p'} variant="bodyMd">
                {specialOrder.orders.map(order => order.name).join(', ')}
              </Text>
            </IndexTable.Cell>
            <IndexTable.Cell>
              <Text as={'p'} variant="bodyMd">
                {specialOrder.workOrders.map(order => order.name).join(', ')}
              </Text>
            </IndexTable.Cell>
          </IndexTable.Row>
        ))}
      </IndexTable>

      {toast}
    </LegacyCard>
  );
}
