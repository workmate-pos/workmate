import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { ListPopup } from '@work-orders/common-pos/screens/ListPopup.js';
import { useScreen } from '@teifi-digital/pos-tools/router';
import { useRouter } from '../../routes.js';
import { isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { useDebouncedState } from '@work-orders/common-pos/hooks/use-debounced-state.js';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import { useLocationsQuery, Location } from '@work-orders/common/queries/use-locations-query.js';
import { getSubtitle } from '@work-orders/common-pos/util/subtitle.js';

export function LocationSelector({
  onSelect,
  onClear,
}: {
  onSelect: (location: Location) => void;
  onClear?: () => void;
}) {
  const fetch = useAuthenticatedFetch();
  const [query, setQuery] = useDebouncedState('');
  const locationsQuery = useLocationsQuery({ fetch, params: { query } });

  const screen = useScreen();
  screen.setIsLoading(locationsQuery.isLoading);

  const locations = locationsQuery.data?.pages.flat() ?? [];

  return (
    <ListPopup
      title={'Select Location'}
      query={{ query, setQuery }}
      isLoadingMore={locationsQuery.isFetching}
      onEndReached={() => locationsQuery.fetchNextPage()}
      selection={{
        type: 'select',
        items: [
          onClear ? { id: '', leftSide: { label: 'Clear' } } : null,
          ...locations.map(location => ({
            id: location.id,
            leftSide: {
              label: location.name,
              subtitle: getSubtitle(location.address.formatted),
            },
          })),
        ].filter(isNonNullable),
        onSelect: locationId =>
          locationId === '' ? onClear?.() : onSelect(locations.find(location => location.id === locationId) ?? never()),
      }}
      useRouter={useRouter}
    />
  );
}
