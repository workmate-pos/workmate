import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { useDebouncedState } from '@work-orders/common-pos/hooks/use-debounced-state.js';
import { UseRouter } from './router.js';
import { BaseLocationSelector } from './BaseLocationSelector.js';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { CompanyLocation, useCompanyLocationsQuery } from '@work-orders/common/queries/use-company-locations-query.js';

export type CompanyLocationSelectorProps = {
  companyId: ID;
  onSelect: (location: CompanyLocation) => void;
  useRouter: UseRouter;
};

export function CompanyLocationSelector({ companyId, onSelect, useRouter }: CompanyLocationSelectorProps) {
  const [query, setQuery] = useDebouncedState('');

  const fetch = useAuthenticatedFetch();

  const locationsQuery = useCompanyLocationsQuery(companyId, { fetch, params: { query } });
  const locations = locationsQuery.data?.pages.flat() ?? [];

  return (
    <BaseLocationSelector
      locations={locations}
      onSelect={onSelect}
      query={query}
      onQuery={query => setQuery(query, !query)}
      onLoadMore={locationsQuery.fetchNextPage}
      isLoading={locationsQuery.isLoading}
      isRefetching={locationsQuery.isRefetching}
      isSuccess={locationsQuery.isSuccess}
      useRouter={useRouter}
      isError={locationsQuery.isError}
      error={locationsQuery.error}
    />
  );
}
