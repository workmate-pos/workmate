import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { ListPopup } from '@work-orders/common-pos/screens/ListPopup.js';
import { useScreen } from '@teifi-digital/pos-tools/router';
import { useRouter } from '../../routes.js';
import { isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { useDebouncedState } from '@work-orders/common-pos/hooks/use-debounced-state.js';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import { CompanyLocation, useCompanyLocationsQuery } from '@work-orders/common/queries/use-company-locations-query.js';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { getSubtitle } from '@work-orders/common-pos/util/subtitle.js';

export function CompanyLocationSelector({
  companyId,
  onSelect,
  onClear,
}: {
  companyId: ID;
  onSelect: (companyLocation: CompanyLocation) => void;
  onClear?: () => void;
}) {
  const fetch = useAuthenticatedFetch();
  const [query, setQuery] = useDebouncedState('');
  const companyLocationsQuery = useCompanyLocationsQuery(companyId, { fetch, params: { query } });

  const screen = useScreen();
  screen.setIsLoading(companyLocationsQuery.isLoading);

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
