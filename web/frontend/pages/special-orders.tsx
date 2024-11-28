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
} from '@shopify/polaris';
import { PermissionBoundary } from '../components/PermissionBoundary.js';
import { Loading, TitleBar, useAppBridge } from '@shopify/app-bridge-react';
import { useToast } from '@teifi-digital/shopify-app-react';
import { useAuthenticatedFetch } from '../hooks/use-authenticated-fetch.js';
import { useSettingsQuery } from '@work-orders/common/queries/use-settings-query.js';
import { emptyState } from '@web/frontend/assets/index.js';
import { Redirect } from '@shopify/app-bridge/actions';
import { sentenceCase, titleCase } from '@teifi-digital/shopify-app-toolbox/string';
import { useEffect, useMemo, useState } from 'react';
import { useDebouncedState } from '../hooks/use-debounced-state.js';
import { useSpecialOrdersQuery } from '@work-orders/common/queries/use-special-orders-query.js';
import { isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { useLocationsQuery } from '@work-orders/common/queries/use-locations-query.js';
import { useVendorsQuery } from '@work-orders/common/queries/use-vendors-query.js';
import { useInfinitePagination } from '@work-orders/common/util/pagination.js';

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
      limit: 50,
      lineItemVendorName: [vendorName].filter(isNonNullable),
      lineItemOrderState: lineItemState,
      locationId,
    },
  });

  const { page, reset, ...pagination } = useInfinitePagination({
    pages: specialOrderInfoQuery.data?.pages ?? [],
    hasNext: specialOrderInfoQuery.hasNextPage,
    onNext: specialOrderInfoQuery.fetchNextPage,
  });

  useEffect(() => {
    reset();
  }, [query, locationId, vendorName, lineItemState]);

  const settingsQuery = useSettingsQuery({ fetch });

  if (settingsQuery.isLoading) {
    return <Loading />;
  }

  const redirectToSpecialOrder = (specialOrderName: 'new' | string) => {
    Redirect.create(app).dispatch(Redirect.Action.APP, `/special-orders/${encodeURIComponent(specialOrderName)}`);
  };

  return (
    <>
      <TitleBar title="Special orders" />

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
        itemCount={page?.length ?? 0}
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
        pagination={pagination}
      >
        {page?.map((specialOrder, i) => (
          <IndexTable.Row
            key={specialOrder.name}
            id={specialOrder.name}
            position={i}
            onClick={() => redirectToSpecialOrder(specialOrder.name)}
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
