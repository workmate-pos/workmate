import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import { useLocationsQuery, Location } from '@work-orders/common/queries/use-locations-query.js';
import { UseRouter } from '../router.js';
import { useDebouncedState } from '../../hooks/use-debounced-state.js';
import { ListPopup } from '../ListPopup.js';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { getLocationItem } from './LocationSelector.js';

export type MultiLocationSelectorProps = {
  onSelect: (locations: Location[]) => void;
  initialSelection?: ID[];
  useRouter: UseRouter;
};

export function MultiLocationSelector({ onSelect, initialSelection, useRouter }: MultiLocationSelectorProps) {
  const fetch = useAuthenticatedFetch();
  const [query, setQuery] = useDebouncedState('');
  const locationsQuery = useLocationsQuery({ fetch, params: { query } });

  const locations = locationsQuery.data?.pages.flat() ?? [];

  return (
    <ListPopup
      title={'Select locations'}
      query={{ query, setQuery }}
      resourceName={{ singular: 'location', plural: 'locations' }}
      isLoadingMore={locationsQuery.isFetching}
      onEndReached={() => locationsQuery.fetchNextPage()}
      selection={{
        type: 'multi-select',
        items: locations.map(location => getLocationItem(location)),
        initialSelection,
        onSelect: locationIds =>
          onSelect(locationIds.map(id => locations.find(location => location.id === id) ?? never())),
      }}
      useRouter={useRouter}
    />
  );
}
