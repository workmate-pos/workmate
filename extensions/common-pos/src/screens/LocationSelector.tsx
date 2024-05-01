import { List, ListRow, ScrollView, Stack, Text } from '@shopify/retail-ui-extensions-react';
import { useLocationsQuery } from '@work-orders/common/queries/use-locations-query.js';
import type { Location } from '@work-orders/common/queries/use-locations-query.js';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { ControlledSearchBar } from '@teifi-digital/pos-tools/components/ControlledSearchBar.js';
import { useDebouncedState } from '@work-orders/common-pos/hooks/use-debounced-state.js';
import { UseRouter } from './router.js';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';

export type LocationSelectorProps = {
  onSelect: (location: Location) => void;
  useRouter: UseRouter;
};

export function LocationSelector({ onSelect, useRouter }: LocationSelectorProps) {
  const [query, setQuery] = useDebouncedState('');

  const fetch = useAuthenticatedFetch();

  const locationsQuery = useLocationsQuery({ fetch, params: { query } });
  const locations = locationsQuery.data?.pages.flat() ?? [];

  const rows = getLocationRows(useRouter, locations, onSelect);

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

function getLocationRows(
  useRouter: LocationSelectorProps['useRouter'],
  locations: Location[],
  onSelect: (location: Location) => void,
) {
  const router = useRouter();

  return locations.map<ListRow>(location => {
    return {
      id: location.id,
      onPress: () => {
        router.popCurrent();
        onSelect(location);
      },
      leftSide: {
        label: location.name,
        subtitle: getFormattedAddressSubtitle(location.address.formatted),
      },
      rightSide: { showChevron: true },
    };
  });
}

function getFormattedAddressSubtitle(formattedAddress: string[]): ListRow['leftSide']['subtitle'] {
  if (formattedAddress.length === 0) return ['No address'] as const;
  if (formattedAddress.length === 1) return [formattedAddress[0]!] as const;
  if (formattedAddress.length === 2) return [formattedAddress[0]!, formattedAddress[1]!] as const;
  return [formattedAddress[0]!, formattedAddress[1]!, formattedAddress[2]!] as const;
}
