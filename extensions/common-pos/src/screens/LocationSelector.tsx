import { useLocationsQuery } from '@work-orders/common/queries/use-locations-query.js';
import type { Location } from '@work-orders/common/queries/use-locations-query.js';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { useDebouncedState } from '@work-orders/common-pos/hooks/use-debounced-state.js';
import { UseRouter } from './router.js';
import { BaseLocationSelector, LocationSelectOptions } from './BaseLocationSelector.js';

export type LocationSelectorProps = { useRouter: UseRouter; selection: LocationSelectOptions<Location> };

export function LocationSelector({ useRouter, selection }: LocationSelectorProps) {
  const [query, setQuery] = useDebouncedState('');

  const fetch = useAuthenticatedFetch();

  const locationsQuery = useLocationsQuery({ fetch, params: { query } });
  const locations = locationsQuery.data?.pages.flat() ?? [];

  return (
    <BaseLocationSelector
      locations={locations}
      query={query}
      onQuery={query => setQuery(query, !query)}
      onLoadMore={locationsQuery.fetchNextPage}
      isLoading={locationsQuery.isLoading}
      isRefetching={locationsQuery.isRefetching}
      isSuccess={locationsQuery.isSuccess}
      useRouter={useRouter}
      isError={locationsQuery.isError}
      error={locationsQuery.error}
      selection={selection}
    />
  );
}
