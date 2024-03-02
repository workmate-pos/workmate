import { useDebouncedState } from '@work-orders/common/hooks/use-debounced-state.js';
import { List, ListRow, ScrollView, Stack, Text } from '@shopify/retail-ui-extensions-react';
import { useLocationsQuery } from '@work-orders/common/queries/use-locations-query.js';
import type { Location } from '@work-orders/common/queries/use-locations-query.js';
import { getFormattedAddressSubtitle } from '../../util/formatted-address-subtitle.js';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { ControlledSearchBar } from '@teifi-digital/pos-tools/components/ControlledSearchBar.js';
import { extractErrorMessage } from '@teifi-digital/pos-tools/utils/errors.js';

export function LocationSelector({ onSelect }: { onSelect: (location: Location) => void }) {
  const [query, setQuery] = useDebouncedState('');

  const fetch = useAuthenticatedFetch();

  const locationsQuery = useLocationsQuery({ fetch, params: { query } });
  const locations = locationsQuery.data?.pages.flat() ?? [];

  const rows = getLocationRows(locations, onSelect);

  return (
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
