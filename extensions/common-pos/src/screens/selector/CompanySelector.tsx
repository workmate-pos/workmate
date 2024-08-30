import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { Company, useCompaniesQuery } from '@work-orders/common/queries/use-companies-query.js';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import { useDebouncedState } from '../../hooks/use-debounced-state.js';
import { UseRouter } from '../router.js';
import { ListPopup } from '../ListPopup.js';
import { getSubtitle } from '../../util/subtitle.js';

export type CompanySelectorProps = {
  onSelect: (company: Company) => void;
  onClear?: () => void;
  useRouter: UseRouter;
};

export function CompanySelector({ onSelect, onClear, useRouter }: CompanySelectorProps) {
  const fetch = useAuthenticatedFetch();
  const [query, setQuery] = useDebouncedState('');
  const companiesQuery = useCompaniesQuery({ fetch, params: { query } });

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
