import { useScreen } from '@work-orders/common-pos/hooks/use-screen.js';
import { useDebouncedState } from '@work-orders/common/hooks/use-debounced-state.js';
import { List, ListRow, ScrollView, Stack, Text } from '@shopify/retail-ui-extensions-react';
import { useAuthenticatedFetch } from '@work-orders/common-pos/hooks/use-authenticated-fetch.js';
import { extractErrorMessage } from '@work-orders/common-pos/util/errors.js';
import { ControlledSearchBar } from '@work-orders/common-pos/components/ControlledSearchBar.js';
import { useLocationsQuery } from '@work-orders/common/queries/use-locations-query.js';
import type { Location } from '@work-orders/common/queries/use-locations-query.js';
import { getFormattedAddressSubtitle } from '../../util/formatted-address-subtitle.js';

export function LocationSelector() {
  const [query, setQuery] = useDebouncedState('');

  const { Screen, closePopup } = useScreen('LocationSelector', () => {
    setQuery('', true);
  });

  const fetch = useAuthenticatedFetch();

  const locationsQuery = useLocationsQuery({ fetch, params: { query } });
  const locations = locationsQuery.data?.pages ?? [];

  const rows = getLocationRows(locations, (location: Location) => closePopup(location));

  return (
    <Screen title="Select Location" presentation={{ sheet: true }}>
      <ScrollView>
        <Stack direction="horizontal" alignment="center" flex={1} paddingHorizontal={'HalfPoint'}>
          <Text variant="body" color="TextSubdued">
            {locationsQuery.isRefetching ? 'Reloading...' : ' '}
          </Text>
        </Stack>
        <ControlledSearchBar
          value={query}
          onTextChange={(query: string) => setQuery(query, !query)}
          onSearch={() => {}}
          placeholder={'Search locations'}
        />
        <List
          data={rows}
          onEndReached={locationsQuery.fetchNextPage}
          isLoadingMore={locationsQuery.isLoading}
          imageDisplayStrategy={'always'}
        />
        {locationsQuery.isLoading && (
          <Stack direction="horizontal" alignment="center" flex={1} paddingVertical="ExtraLarge">
            <Text variant="body" color="TextSubdued">
              Loading locations...
            </Text>
          </Stack>
        )}
        {locationsQuery.isSuccess && rows.length === 0 && (
          <Stack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
            <Text variant="body" color="TextSubdued">
              No locations found
            </Text>
          </Stack>
        )}
        {locationsQuery.isError && (
          <Stack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
            <Text color="TextCritical" variant="body">
              {extractErrorMessage(locationsQuery.error, 'Error loading locations')}
            </Text>
          </Stack>
        )}
      </ScrollView>
    </Screen>
  );
}

function getLocationRows(locations: Location[], selectLocation: (location: Location) => void) {
  return locations.map<ListRow>(location => {
    return {
      id: location.id,
      onPress: () => selectLocation(location),
      leftSide: {
        label: location.name,
        subtitle: getFormattedAddressSubtitle(location.address.formatted),
      },
      rightSide: { showChevron: true },
    };
  });
}
