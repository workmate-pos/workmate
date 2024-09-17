import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import { useLocationsQuery, Location } from '@work-orders/common/queries/use-locations-query.js';
import { UseRouter } from '../router.js';
import { useDebouncedState } from '../../hooks/use-debounced-state.js';
import { getSubtitle } from '../../util/subtitle.js';
import { ListPopup, ListPopupItem } from '../ListPopup.js';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';

export type LocationSelectorProps = {
  onSelect: (location: Location) => void;
  onClear?: () => void;
  useRouter: UseRouter;
};

export function LocationSelector({ onSelect, onClear, useRouter }: LocationSelectorProps) {
  const fetch = useAuthenticatedFetch();
  const [query, setQuery] = useDebouncedState('');
  const locationsQuery = useLocationsQuery({ fetch, params: { query } });

  const locations = locationsQuery.data?.pages.flat() ?? [];

  return (
    <ListPopup
      title={'Select Location'}
      query={{ query, setQuery }}
      resourceName={{ singular: 'location', plural: 'locations' }}
      isLoadingMore={locationsQuery.isFetching}
      onEndReached={() => locationsQuery.fetchNextPage()}
      selection={{
        type: 'select',
        items: [
          onClear ? { id: '', leftSide: { label: 'Clear' } } : null,
          ...locations.map(location => getLocationItem(location)),
        ].filter(isNonNullable),
        onSelect: locationId =>
          locationId === '' ? onClear?.() : onSelect(locations.find(location => location.id === locationId) ?? never()),
      }}
      useRouter={useRouter}
    />
  );
}

export function getLocationItem(location: Location): ListPopupItem<ID> {
  return {
    id: location.id,
    leftSide: {
      label: location.name,
      subtitle: getSubtitle(location.address.formatted),
    },
  };
}
