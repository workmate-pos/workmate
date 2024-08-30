import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { ListPopup } from '@work-orders/common-pos/screens/ListPopup.js';
import { useScreen } from '@teifi-digital/pos-tools/router';
import { useRouter } from '../../routes.js';
import { isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { Company, useCompaniesQuery } from '@work-orders/common/queries/use-companies-query.js';
import { useDebouncedState } from '@work-orders/common-pos/hooks/use-debounced-state.js';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import { getSubtitle } from '@work-orders/common-pos/util/subtitle.js';

export function CompanySelector({ onSelect, onClear }: { onSelect: (company: Company) => void; onClear?: () => void }) {
  const fetch = useAuthenticatedFetch();
  const [query, setQuery] = useDebouncedState('');
  const companiesQuery = useCompaniesQuery({ fetch, params: { query } });

  const screen = useScreen();
  screen.setIsLoading(companiesQuery.isLoading);

  const companies = companiesQuery.data?.pages.flat() ?? [];

  return (
    <ListPopup
      title={'Select Company'}
      query={{ query, setQuery }}
      isLoadingMore={companiesQuery.isFetching}
      onEndReached={() => companiesQuery.fetchNextPage()}
      selection={{
        type: 'select',
        items: [
          onClear ? { id: '', leftSide: { label: 'Clear' } } : null,
          ...companies.map(company => ({
            id: company.id,
            leftSide: {
              label: company.name,
              subtitle: getSubtitle([
                !company.mainContact?.customer
                  ? {
                      content: 'Missing company contact',
                      color: 'TextCritical',
                    }
                  : null,
                company.mainContact?.customer.displayName,
                company.mainContact?.customer.email,
                company.mainContact?.customer.phone,
              ]),
            },
            disabled: !company.mainContact,
          })),
        ].filter(isNonNullable),
        onSelect: companyId =>
          companyId === '' ? onClear?.() : onSelect(companies.find(company => company.id === companyId) ?? never()),
      }}
      useRouter={useRouter}
    />
  );
}
