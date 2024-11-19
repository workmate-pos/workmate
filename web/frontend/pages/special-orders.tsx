import {
  Badge,
  Card,
  Checkbox,
  ChoiceList,
  EmptyState,
  Frame,
  IndexFilters,
  IndexFiltersMode,
  IndexTable,
  Page,
  Text,
  useIndexResourceState,
} from '@shopify/polaris';
import { PermissionBoundary } from '../components/PermissionBoundary.js';
import { Loading, TitleBar, useAppBridge } from '@shopify/app-bridge-react';
import { ToastActionCallable, useToast } from '@teifi-digital/shopify-app-react';
import { useAuthenticatedFetch } from '../hooks/use-authenticated-fetch.js';
import { useSettingsQuery } from '@work-orders/common/queries/use-settings-query.js';
import { emptyState } from '@web/frontend/assets/index.js';
import { Redirect } from '@shopify/app-bridge/actions';
import { sentenceCase, titleCase } from '@teifi-digital/shopify-app-toolbox/string';
import { useEffect, useMemo, useState } from 'react';
import { useDebouncedState } from '../hooks/use-debounced-state.js';
import { useSpecialOrdersQuery } from '@work-orders/common/queries/use-special-orders-query.js';
import { hasNonNullableProperty, isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { useLocationsQuery } from '@work-orders/common/queries/use-locations-query.js';
import { useVendorsQuery } from '@work-orders/common/queries/use-vendors-query.js';
import { BulkActionsProps } from '@shopify/polaris/build/ts/src/components/BulkActions/index.js';
import { unique } from '@teifi-digital/shopify-app-toolbox/array';
import { useProductVariantQueries } from '@work-orders/common/queries/use-product-variant-query.js';
import { usePurchaseOrderMutation } from '@work-orders/common/queries/use-purchase-order-mutation.js';
import { useCustomFieldsPresetsQuery } from '@work-orders/common/queries/use-custom-fields-presets-query.js';
import { getCreatePurchaseOrderForSpecialOrders } from '@work-orders/common/create-purchase-order/from-special-orders.js';
import { DetailedSpecialOrder } from '@web/services/special-orders/types.js';
import { useLocationQuery } from '@work-orders/common/queries/use-location-query.js';

export default function () {
  return (
    <Frame>
      <Page fullWidth>
        <PermissionBoundary permissions={['read_special_orders']}>
          <SpecialOrders />
        </PermissionBoundary>
      </Page>
    </Frame>
  );
}

function SpecialOrders() {
  const app = useAppBridge();

  const [query, setQuery, internalQuery] = useDebouncedState('');
  const [page, setPage] = useState(0);
  const [mode, setMode] = useState<IndexFiltersMode>(IndexFiltersMode.Default);

  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });

  const [locationId, setLocationId] = useState<ID>();
  const [vendorName, setVendorName] = useState<string>();
  const [lineItemState, setLineItemState] = useState<'not-fully-ordered' | 'fully-ordered'>();

  const locationsQuery = useLocationsQuery({ fetch, params: { first: 50 } });
  const locations = locationsQuery.data?.pages.flat() ?? [];

  useEffect(() => {
    if (!locationsQuery.isFetching && locationsQuery.hasNextPage) {
      locationsQuery.fetchNextPage();
    }
  }, [locationsQuery.isFetching, locationsQuery.hasNextPage]);

  const vendorsQuery = useVendorsQuery({
    fetch,
    filters:
      lineItemState || locationId
        ? {
            specialOrderLocationId: locationId,
            specialOrderLineItemOrderState: lineItemState,
          }
        : undefined,
  });
  const vendors = useMemo(() => vendorsQuery.data?.flat() ?? [], [vendorsQuery.data]);

  const specialOrderInfoQuery = useSpecialOrdersQuery({
    fetch,
    params: {
      query,
      limit: 25,
      lineItemVendorName: vendorName,
      lineItemOrderState: lineItemState,
      locationId,
    },
  });
  const specialOrders = specialOrderInfoQuery.data?.pages?.[page] ?? [];

  useEffect(() => {
    if (specialOrderInfoQuery.data?.pages.length === 1) {
      specialOrderInfoQuery.fetchNextPage();
    }
  }, [specialOrderInfoQuery.data?.pages.length]);

  useEffect(() => {
    specialOrderInfoQuery.fetchNextPage();
  }, []);

  const settingsQuery = useSettingsQuery({ fetch });

  const { allResourcesSelected, clearSelection, selectedResources, removeSelectedResources, handleSelectionChange } =
    useIndexResourceState(specialOrders, { resourceIDResolver: specialOrder => specialOrder.name });

  const mergeBulkAction = useMergeSpecialOrdersBulkAction(specialOrders, setToastAction, vendorName, locationId);

  if (settingsQuery.isLoading) {
    return <Loading />;
  }

  const redirectToSpecialOrder = (specialOrderName: 'new' | string) => {
    Redirect.create(app).dispatch(Redirect.Action.APP, `/special-orders/${encodeURIComponent(specialOrderName)}`);
  };

  const shouldFetchNextPage = specialOrderInfoQuery.data && page === specialOrderInfoQuery.data.pages.length - 2;
  const hasNextPage = !specialOrderInfoQuery.isFetching && page < (specialOrderInfoQuery.data?.pages.length ?? 0) - 1;

  return (
    <>
      <TitleBar
        title="Special orders"
        primaryAction={
          false
            ? {
                content: 'New special order',
                onAction: () => redirectToSpecialOrder('new'),
              }
            : undefined
        }
      />

      <IndexFilters
        mode={mode}
        setMode={setMode}
        filters={[
          {
            key: 'location',
            label: 'Location',
            pinned: true,
            filter: (
              <ChoiceList
                title={'Location'}
                choices={locations.map(location => ({
                  value: location.id,
                  id: location.id,
                  label: location.name,
                }))}
                onChange={([selected]) => {
                  setLocationId(selected as ID);
                  clearSelection();
                }}
                selected={[locationId].filter(isNonNullable)}
              />
            ),
          },
          {
            key: 'state',
            label: 'State',
            pinned: true,
            filter: (
              <Checkbox
                label={'Not fully ordered'}
                checked={lineItemState === 'not-fully-ordered'}
                onChange={checked => {
                  setLineItemState(checked ? 'not-fully-ordered' : undefined);
                  clearSelection();
                }}
              />
            ),
          },
          {
            key: 'vendor',
            label: 'Vendor',
            pinned: true,
            filter:
              vendors.length === 0 ? (
                <Text as={'p'} variant={'bodyMd'} fontWeight={'bold'}>
                  No vendors found
                </Text>
              ) : (
                <ChoiceList
                  title={'Vendors'}
                  choices={vendors.map(vendor => ({
                    value: vendor.name,
                    label: vendor.name,
                    id: vendor.name,
                  }))}
                  onChange={([selected]) => {
                    setVendorName(selected);
                    clearSelection();
                  }}
                  selected={[vendorName].filter(isNonNullable)}
                />
              ),
          },
        ]}
        appliedFilters={[
          locationId
            ? {
                key: 'location',
                label: `Location is ${locations.find(location => location.id === locationId)?.name ?? 'unknown'}`,
                onRemove: () => setLocationId(undefined),
              }
            : null,
          lineItemState
            ? {
                key: 'state',
                label: `Is ${titleCase(lineItemState).toLowerCase()}`,
                onRemove: () => setLineItemState(undefined),
              }
            : null,
          vendorName
            ? {
                key: 'vendor',
                label: `Vendor is ${vendorName}`,
                onRemove: () => setVendorName(undefined),
              }
            : null,
        ].filter(isNonNullable)}
        onQueryChange={query => setQuery(query)}
        onQueryClear={() => setQuery('', true)}
        queryValue={internalQuery}
        onClearAll={() => {
          setQuery('', true);
          setVendorName(undefined);
          setLineItemState(undefined);
          setLocationId(undefined);
        }}
        tabs={[{ content: 'All', id: 'all' }]}
        canCreateNewView={false}
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
        itemCount={specialOrders.length}
        loading={specialOrderInfoQuery.isLoading}
        emptyState={
          <Card>
            <EmptyState
              heading={'Special orders'}
              image={emptyState}
              action={{
                content: 'Create special orders through work orders',
                onAction: () => Redirect.create(app).dispatch(Redirect.Action.APP, '/work-orders'),
              }}
            >
              Track and manage your special orders.
            </EmptyState>
          </Card>
        }
        pagination={{
          hasNext: hasNextPage,
          hasPrevious: page > 0,
          onPrevious: () => setPage(page => page - 1),
          onNext: () => {
            if (shouldFetchNextPage) {
              specialOrderInfoQuery.fetchNextPage();
            }

            setPage(page => page + 1);
          },
        }}
        selectable
        selectedItemsCount={allResourcesSelected ? 'All' : selectedResources.length}
        onSelectionChange={handleSelectionChange}
        promotedBulkActions={[mergeBulkAction]}
      >
        {specialOrders.map((specialOrder, i) => (
          <IndexTable.Row
            key={specialOrder.name}
            id={specialOrder.name}
            position={i}
            onClick={() => redirectToSpecialOrder(specialOrder.name)}
            selected={selectedResources.includes(specialOrder.name)}
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
    </>
  );
}

/**
 * Intersect multiple arrays
 */
function intersect<T>(...arrays: T[][]): T[] {
  if (arrays.length === 0) {
    return [];
  }

  return arrays.reduce((a, b) => a.filter(x => b.includes(x)));
}

function useMergeSpecialOrdersBulkAction(
  selectedSpecialOrders: DetailedSpecialOrder[],
  setToastAction: ToastActionCallable,
  filterVendorName: string | undefined,
  filterLocationId: ID | undefined,
): NonNullable<BulkActionsProps['promotedActions']>[number] {
  const app = useAppBridge();
  const fetch = useAuthenticatedFetch({ setToastAction });

  const productVariantIds = unique(
    selectedSpecialOrders.flatMap(specialOrder => specialOrder.lineItems).map(lineItem => lineItem.productVariantId),
  );

  const productVariantQueries = useProductVariantQueries({ fetch, ids: productVariantIds });

  const settingsQuery = useSettingsQuery({ fetch });
  const purchaseOrderMutation = usePurchaseOrderMutation({ fetch });
  const purchaseOrderCustomFieldsPresetsQuery = useCustomFieldsPresetsQuery({ fetch, type: 'PURCHASE_ORDER' });
  const lineItemCustomFieldsPresetsQuery = useCustomFieldsPresetsQuery({ fetch, type: 'LINE_ITEM' });

  // Try to find vendor names / locations that all selected special orders have in common.
  // If a search query is provided we will just use that

  const commonVendorNames = filterVendorName
    ? [filterVendorName]
    : intersect(
        ...selectedSpecialOrders.map(specialOrder =>
          specialOrder.lineItems
            .map(lineItem => productVariantQueries[lineItem.productVariantId]?.data?.product?.vendor)
            .filter(isNonNullable)
            .filter(vendorName => vendorName !== ''),
        ),
      );

  const commonLocationIds = filterLocationId
    ? [filterLocationId]
    : intersect(...selectedSpecialOrders.map(specialOrder => [specialOrder.location.id]));

  const [locationId] = commonLocationIds;
  const [vendorName] = commonVendorNames;

  const locationQuery = useLocationQuery({ fetch, id: locationId ?? null });

  if (selectedSpecialOrders.length === 0) {
    return {
      id: 'merge',
      content: 'No special orders selected',
      disabled: true,
    };
  }

  if (purchaseOrderMutation.isPending) {
    return {
      id: 'merge',
      content: 'Creating purchase order...',
      disabled: true,
    };
  }

  if (locationQuery.isLoading) {
    return {
      id: 'merge',
      content: 'Loading...',
      disabled: true,
    };
  }

  const status = settingsQuery.data?.settings.purchaseOrders.defaultStatus;
  const purchaseOrderCustomFields = purchaseOrderCustomFieldsPresetsQuery.data?.defaultCustomFields;
  const lineItemCustomFields = lineItemCustomFieldsPresetsQuery.data?.defaultCustomFields;

  if (
    !status ||
    !purchaseOrderCustomFields ||
    !lineItemCustomFields ||
    productVariantIds.some(productVariantId => !productVariantQueries[productVariantId]?.data?.product)
  ) {
    return {
      id: 'merge',
      content: 'Loading...',
      disabled: true,
    };
  }

  if (commonLocationIds.length > 1 || commonVendorNames.length > 1) {
    return {
      id: 'merge',
      content: 'Cannot merge special orders - multiple vendors or locations',
      disabled: true,
    };
  }

  if (!locationId || !vendorName) {
    return {
      id: 'merge',
      content: 'Cannot merge special orders - no common vendor or location ',
      disabled: true,
    };
  }

  const location = locationQuery.data;

  if (!location) {
    return {
      id: 'merge',
      content: 'Cannot merge special orders - location not found',
      disabled: true,
    };
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
    return {
      id: 'merge',
      content: 'Cannot merge special orders - no line items found',
      disabled: true,
    };
  }

  return {
    id: 'merge',
    content: `Merge into Purchase Order for ${vendorName} at ${location.name}`,
    onAction: () => {
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
  };
}
