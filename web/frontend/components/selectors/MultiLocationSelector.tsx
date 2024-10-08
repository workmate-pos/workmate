import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { useToast } from '@teifi-digital/shopify-app-react';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { useEffect, useState } from 'react';
import { useLocationsQuery } from '@work-orders/common/queries/use-locations-query.js';
import { getInfiniteQueryPagination } from '@web/frontend/util/pagination.js';
import { Filters, Modal, ResourceItem, ResourceList, Text } from '@shopify/polaris';
import { useDebouncedState } from '@web/frontend/hooks/use-debounced-state.js';
import { unique } from '@teifi-digital/shopify-app-toolbox/array';
import { keepPreviousData } from '@tanstack/react-query';

export function MultiLocationSelector({
  open,
  onClose,
  selected,
  onChange,
}: {
  open: boolean;
  onClose: () => void;
  selected: ID[];
  onChange: (locationIds: ID[]) => void;
}) {
  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });

  const [query, setQuery, optimisticQuery] = useDebouncedState('');

  const locationsQuery = useLocationsQuery({
    fetch,
    params: { query },
    options: { placeholderData: keepPreviousData },
  });

  const [pageIndex, setPageIndex] = useState(0);
  const pagination = getInfiniteQueryPagination(pageIndex, setPageIndex, locationsQuery);

  const page = locationsQuery.data?.pages[pageIndex] ?? [];

  useEffect(() => {
    setPageIndex(0);
  }, [query]);

  return (
    <>
      <Modal open={open} title={'Select Locations'} onClose={onClose}>
        <ResourceList
          items={page}
          resourceName={{ singular: 'location', plural: 'locations' }}
          resolveItemId={location => location.id}
          loading={locationsQuery.isFetching}
          selectable
          pagination={{
            hasNext: pagination.hasNextPage,
            hasPrevious: pagination.hasPreviousPage,
            onNext: pagination.next,
            onPrevious: pagination.previous,
          }}
          filterControl={
            <Filters
              filters={[]}
              onQueryChange={query => setQuery(query, !query)}
              onQueryClear={() => setQuery('', true)}
              onClearAll={() => setQuery('', true)}
              queryValue={optimisticQuery}
              queryPlaceholder={'Search locations'}
            />
          }
          onSelectionChange={locationIds => {
            if (locationIds === 'All') {
              onChange(
                unique([...selected, ...(locationsQuery.data?.pages.flat().map(location => location.id) ?? [])]),
              );
              return;
            } else {
              onChange(locationIds.map(id => id as ID));
            }
          }}
          selectedItems={selected}
          renderItem={location => (
            <ResourceItem
              id={location.id}
              onClick={() => {
                const isSelected = selected.includes(location.id);
                if (isSelected) {
                  onChange(selected.filter(id => id !== location.id));
                } else {
                  onChange([...selected, location.id]);
                }
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
        />
      </Modal>

      {toast}
    </>
  );
}
