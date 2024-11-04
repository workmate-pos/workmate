import { PermissionBoundary } from '@web/frontend/components/PermissionBoundary.js';
import {
  Badge,
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
import { sentenceCase, titleCase } from '@teifi-digital/shopify-app-toolbox/string';
import { useVendorsQuery } from '@work-orders/common/queries/use-vendors-query.js';
import { getCreatePurchaseOrderForSpecialOrders } from '@work-orders/common/create-purchase-order/from-special-orders.js';

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
  const [vendorName, setVendorName] = useState<string>();

  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });
  const vendorsQuery = useVendorsQuery({
    fetch,
    filters: {
      specialOrderLocationId: locationId,
      specialOrderLineItemOrderState: 'not-fully-ordered',
    },
  });
  const locationsQuery = useLocationsQuery({ fetch, params: {} });
  const specialOrdersQuery = useSpecialOrdersQuery({
    fetch,
    params: {
      query,
      locationId,
      lineItemVendorName: vendorName,
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
  const vendors = vendorsQuery.data ?? [];

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
      <TitleBar title="Merge special orders" />

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
            content: 'All vendors',
            onAction: () => {
              setVendorName(undefined);
              clearSelection();
            },
          },
          ...vendors.map(vendor => ({
            id: vendor.name,
            content: vendor.name,
            onAction: () => {
              setVendorName(vendor.name);
              clearSelection();
            },
          })),
        ]}
        selected={vendors.findIndex(vendor => vendor.name === vendorName) + 1}
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
          setVendorName(undefined);
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
        selectable={!!locationId && !!vendorName}
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
        promotedBulkActions={[
          {
            id: 'merge',
            content: 'Merge',
            disabled: selectedResources.length === 0 || !locationId || !vendorName || purchaseOrderMutation.isPending,
            onAction: () => {
              if (!locationId || !vendorName) {
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
                vendorName,
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
          },
        ]}
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
