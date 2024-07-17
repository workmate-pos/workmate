import { List, ListRow, ScrollView, Stack, Text } from '@shopify/retail-ui-extensions-react';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { UseRouter } from './router.js';
import { ControlledSearchBar } from '@teifi-digital/pos-tools/components/ControlledSearchBar.js';
import type { Location } from '@work-orders/common/queries/use-locations-query.js';
import { CompanyLocation } from '@work-orders/common/queries/use-company-locations-query.js';

export type BaseLocationSelectorProps<T extends Location | CompanyLocation> = {
  locations: T[];
  onSelect: (location: T) => void;
  query: string;
  onQuery: (query: string) => void;
  onLoadMore: () => void;
  isLoading: boolean;
  isRefetching: boolean;
  isSuccess: boolean;
  useRouter: UseRouter;
  isError: boolean;
  error: unknown;
};

export function BaseLocationSelector<const T extends Location | CompanyLocation>({
  locations,
  onSelect,
  query,
  onQuery,
  useRouter,
  isRefetching,
  isLoading,
  isSuccess,
  isError,
  error,
  onLoadMore,
}: BaseLocationSelectorProps<T>) {
  const rows = getLocationRows(useRouter, locations, onSelect);

  return (
    <ScrollView>
      <Stack direction="horizontal" alignment="center" flex={1} paddingHorizontal={'HalfPoint'}>
        <Text variant="body" color="TextSubdued">
          {isRefetching ? 'Reloading...' : ' '}
        </Text>
      </Stack>
      {onQuery && (
        <ControlledSearchBar
          value={query}
          onTextChange={onQuery}
          onSearch={() => {}}
          placeholder={'Search locations'}
        />
      )}
      <List data={rows} onEndReached={onLoadMore} isLoadingMore={isRefetching} imageDisplayStrategy={'always'} />
      {isLoading && (
        <Stack direction="horizontal" alignment="center" flex={1} paddingVertical="ExtraLarge">
          <Text variant="body" color="TextSubdued">
            Loading locations...
          </Text>
        </Stack>
      )}
      {isSuccess && rows.length === 0 && (
        <Stack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
          <Text variant="body" color="TextSubdued">
            No locations found
          </Text>
        </Stack>
      )}
      {isError && (
        <Stack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
          <Text color="TextCritical" variant="body">
            {extractErrorMessage(error, 'Error loading locations')}
          </Text>
        </Stack>
      )}
    </ScrollView>
  );
}

function getLocationRows<T extends Location | CompanyLocation>(
  useRouter: BaseLocationSelectorProps<T>['useRouter'],
  locations: T[],
  onSelect: BaseLocationSelectorProps<T>['onSelect'],
) {
  const router = useRouter();

  return locations.map<ListRow>(location => {
    let subtitle: ListRow['leftSide']['subtitle'] = undefined;

    if ('address' in location) {
      subtitle = getFormattedAddressSubtitle(location.address.formatted);
    } else {
      const address = location.billingAddress;
      if (address) {
        subtitle = getFormattedAddressSubtitle(address.formattedAddress);
      } else {
        subtitle = ['No known address'];
      }
    }

    return {
      id: location.id,
      onPress: () => {
        router.popCurrent();
        onSelect(location);
      },
      leftSide: {
        label: location.name,
        subtitle,
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
