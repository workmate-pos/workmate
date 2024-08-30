import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import { CompanyLocation, useCompanyLocationsQuery } from '@work-orders/common/queries/use-company-locations-query.js';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { useDebouncedState } from '../../hooks/use-debounced-state.js';
import { ListPopup } from '../ListPopup.js';
import { UseRouter } from '../router.js';
import { getSubtitle } from '../../util/subtitle.js';

export type CompanyLocationSelectorProps = {
  companyId: ID;
  onSelect: (companyLocation: CompanyLocation) => void;
  onClear?: () => void;
  useRouter: UseRouter;
};

export function CompanyLocationSelector({ companyId, onSelect, onClear, useRouter }: CompanyLocationSelectorProps) {
  const fetch = useAuthenticatedFetch();
  const [query, setQuery] = useDebouncedState('');
  const companyLocationsQuery = useCompanyLocationsQuery(companyId, { fetch, params: { query } });

  const companies = companyLocationsQuery.data?.pages.flat() ?? [];

  return (
    <ListPopup
      title={'Select Company Location'}
      query={{ query, setQuery }}
      isLoadingMore={companyLocationsQuery.isFetching}
      onEndReached={() => companyLocationsQuery.fetchNextPage()}
      selection={{
        type: 'select',
        items: [
          onClear ? { id: '', leftSide: { label: 'Clear' } } : null,
          ...companies.map(companyLocation => ({
            id: companyLocation.id,
            leftSide: {
              label: companyLocation.name,
              subtitle: getSubtitle(companyLocation.billingAddress?.formattedAddress),
            },
          })),
        ].filter(isNonNullable),
        onSelect: companyLocationId =>
          companyLocationId === ''
            ? onClear?.()
            : onSelect(companies.find(companyLocation => companyLocation.id === companyLocationId) ?? never()),
      }}
      useRouter={useRouter}
    />
  );
}
