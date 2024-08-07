import { List, ListRow, ScrollView, Stack, Text } from '@shopify/retail-ui-extensions-react';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { UseRouter } from './router.js';
import { ControlledSearchBar } from '@teifi-digital/pos-tools/components/ControlledSearchBar.js';
import type { Location } from '@work-orders/common/queries/use-locations-query.js';
import { CompanyLocation } from '@work-orders/common/queries/use-company-locations-query.js';
import { P, match } from 'ts-pattern';
import { identity } from '@teifi-digital/shopify-app-toolbox/functional';
import { useState } from 'react';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';

export type BaseLocationSelectorProps<T extends Location | CompanyLocation> = {
  locations: T[];
  query: string;
  onQuery: (query: string) => void;
  onLoadMore: () => void;
  isLoading: boolean;
  isRefetching: boolean;
  isSuccess: boolean;
  useRouter: UseRouter;
  isError: boolean;
  error: unknown;
  selection: LocationSelectOptions<T>;
};

export type LocationSelectOptions<T extends Location | CompanyLocation> =
  | { type: 'select'; onSelect: (location: T) => void }
  // Toggle uses ID since it is possible that an unloaded location is in the initial selection.
  | { type: 'toggle'; onSelection: (locations: ID[]) => void; initialSelection?: ID[] };

export function BaseLocationSelector<const T extends Location | CompanyLocation>({
  locations,
  query,
  onQuery,
  useRouter,
  isRefetching,
  isLoading,
  isSuccess,
  isError,
  error,
  onLoadMore,
  selection,
}: BaseLocationSelectorProps<T>) {
  const rows = useLocationRows(useRouter, locations, selection);

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

function useLocationRows<T extends Location | CompanyLocation>(
  useRouter: BaseLocationSelectorProps<T>['useRouter'],
  locations: T[],
  props: LocationSelectOptions<T>,
) {
  const [selection, setSelection] = useState<ID[]>(props.type === 'toggle' ? props.initialSelection ?? [] : []);

  const router = useRouter();

  return locations.map<ListRow>(location => {
    let subtitle: ListRow['leftSide']['subtitle'];

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
        if ('onSelect' in props) {
          router.popCurrent();
          props.onSelect(location);
        } else if ('onSelection' in props) {
          const newSelection = selection.includes(location.id)
            ? selection.filter(id => id !== location.id)
            : [...selection, location.id];

          setSelection(newSelection);
          props.onSelection(newSelection);
        } else {
          return props satisfies never;
        }
      },
      leftSide: {
        label: location.name,
        subtitle,
      },
      rightSide: {
        showChevron: props.type === 'select',
        toggleSwitch: props.type === 'toggle' ? { value: selection.includes(location.id) } : undefined,
      },
    };
  });
}

function getFormattedAddressSubtitle(formattedAddress: string[]): ListRow['leftSide']['subtitle'] {
  return match(formattedAddress)
    .with([P._, P._, P._], identity)
    .with([P._, P._], identity)
    .with([P._], identity)
    .otherwise(() => undefined);
}
