import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { ToastActionCallable } from '@teifi-digital/shopify-app-react';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { useDebouncedState } from '@web/frontend/hooks/use-debounced-state.js';
import { useCompanyLocationsQuery } from '@work-orders/common/queries/use-company-locations-query.js';
import { Filters, Modal, ResourceItem, ResourceList, Text } from '@shopify/polaris';

export function CompanyLocationSelectorModal({
  open,
  onClose,
  onSelect,
  setToastAction,
  companyId,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (locationId: ID) => void;
  setToastAction: ToastActionCallable;
  companyId: ID;
}) {
  const [query, setQuery] = useDebouncedState('');

  const fetch = useAuthenticatedFetch({ setToastAction });

  const locationsQuery = useCompanyLocationsQuery(companyId, { fetch, params: { query } });
  const locations = locationsQuery.data?.pages.flat() ?? [];

  return (
    <Modal open={open} title={'Select Company Location'} onClose={onClose}>
      <Modal.Section>
        <ResourceList
          items={locations}
          resourceName={{ singular: 'location', plural: 'locations' }}
          resolveItemId={location => location.id}
          loading={locationsQuery.isLoading || locationsQuery.isFetchingNextPage}
          pagination={{
            hasNext: locationsQuery.hasNextPage,
            hasPrevious: locationsQuery.hasPreviousPage,
            onPrevious: () => locationsQuery.fetchPreviousPage(),
            onNext: () => locationsQuery.fetchNextPage(),
          }}
          filterControl={
            <Filters
              filters={[]}
              queryPlaceholder={'Search locations'}
              queryValue={query}
              onQueryChange={setQuery}
              onQueryClear={() => setQuery('', true)}
              onClearAll={() => setQuery('', true)}
            />
          }
          renderItem={location => (
            <ResourceItem
              id={location.id}
              onClick={() => {
                onSelect(location.id);
                onClose();
              }}
            >
              <Text as={'p'} variant={'bodyMd'} fontWeight={'bold'}>
                {location.name}
              </Text>
              <Text as={'p'} variant={'bodyMd'} tone={'subdued'}>
                {location.billingAddress?.formattedAddress?.join(', ')}
              </Text>
            </ResourceItem>
          )}
        />
      </Modal.Section>
    </Modal>
  );
}
