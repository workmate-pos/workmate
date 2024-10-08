import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { useToast } from '@teifi-digital/shopify-app-react';
import { useDebouncedState } from '@web/frontend/hooks/use-debounced-state.js';
import { useEffect, useState } from 'react';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { useLocationsQuery } from '@work-orders/common/queries/use-locations-query.js';
import { Filters, Modal, ResourceItem, ResourceList, Text } from '@shopify/polaris';

export function LocationSelectorModal({
  open,
  onClose,
  onSelect,
  disabledLocationIds,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (locationId: ID) => void;
  disabledLocationIds?: ID[];
}) {
  const [query, setQuery, optimisticQuery] = useDebouncedState('');
  const [page, setPage] = useState(0);

  useEffect(() => {
    setPage(0);
  }, [optimisticQuery]);

  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });
  const locationsQuery = useLocationsQuery({ fetch, params: { query } });
  const locations = locationsQuery.data?.pages?.[page] ?? [];

  const isLastAvailablePage = locationsQuery.data && locationsQuery.data.pages.length - 1 === page;
  const hasNextPage = !isLastAvailablePage || locationsQuery.hasNextPage;

  return (
    <>
      <Modal open={open} title={'Select Location'} onClose={onClose}>
        <ResourceList
          items={locations}
          resourceName={{ singular: 'location', plural: 'locations' }}
          resolveItemId={location => location.name}
          filterControl={
            <Filters
              filters={[]}
              onQueryChange={setQuery}
              onQueryClear={() => setQuery('', true)}
              onClearAll={() => setQuery('', true)}
              queryValue={optimisticQuery}
              queryPlaceholder={'Search locations'}
            />
          }
          renderItem={location => (
            <ResourceItem
              id={location.id}
              disabled={!!disabledLocationIds?.includes(location.id)}
              onClick={() => {
                onSelect(location.id);
                onClose();
              }}
            >
              <Text as={'p'} variant={'bodyMd'} fontWeight={'bold'}>
                {location.name}
              </Text>
              <Text as={'p'} variant={'bodyMd'} tone={'subdued'}>
                {location.address?.formatted?.join(', ')}
              </Text>
            </ResourceItem>
          )}
          loading={locationsQuery.isLoading}
          pagination={{
            hasNext: hasNextPage,
            onNext: () => {
              if (isLastAvailablePage) {
                locationsQuery.fetchNextPage();
              }

              setPage(page => page + 1);
            },
            hasPrevious: page > 0,
            onPrevious: () => setPage(page => page - 1),
          }}
        />
      </Modal>

      {toast}
    </>
  );
}
