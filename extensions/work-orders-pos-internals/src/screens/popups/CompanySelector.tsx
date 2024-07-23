import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { useRouter } from '../../routes.js';
import { List, ListRow, ScrollView, Stack, Text } from '@shopify/retail-ui-extensions-react';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { useDebouncedState } from '@work-orders/common-pos/hooks/use-debounced-state.js';
import { Company, useCompaniesQuery } from '@work-orders/common/queries/use-companies-query.js';
import { useStorePropertiesQuery } from '@work-orders/common/queries/use-store-properties-query.js';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { ControlledSearchBar } from '@teifi-digital/pos-tools/components/ControlledSearchBar.js';
import { SHOPIFY_B2B_PLANS } from '../../util/shopify-plans.js';

export function CompanySelector({
  onSelect,
}: {
  onSelect: (companyId: ID, customerId: ID, companyContactId: ID, companyLocationId: ID) => void;
}) {
  const [query, setQuery] = useDebouncedState('');

  const fetch = useAuthenticatedFetch();

  const companiesQuery = useCompaniesQuery({ fetch, params: { query } });
  const companies = companiesQuery.data?.pages.flat() ?? [];

  const storePropertiesQuery = useStorePropertiesQuery({ fetch });
  const storeProperties = storePropertiesQuery.data?.storeProperties;
  const canSelectCompany = !!storeProperties && SHOPIFY_B2B_PLANS.includes(storeProperties.plan);

  const rows = useCompanyRows(companies, onSelect);

  if (!canSelectCompany) {
    return (
      <Stack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
        <Text variant="body" color="TextSubdued">
          Your Shopify plan does not support B2B features
        </Text>
      </Stack>
    );
  }

  return (
    <ScrollView>
      <Stack direction="horizontal" alignment="center" flex={1} paddingHorizontal={'HalfPoint'}>
        <Text variant="body" color="TextSubdued">
          {companiesQuery.isRefetching ? 'Reloading...' : ' '}
        </Text>
      </Stack>
      <ControlledSearchBar
        value={query}
        onTextChange={(query: string) => setQuery(query, query === '')}
        onSearch={() => {}}
        placeholder="Search companies"
      />
      <List data={rows} onEndReached={() => companiesQuery.fetchNextPage()} isLoadingMore={companiesQuery.isLoading} />
      {companiesQuery.isLoading && (
        <Stack direction="horizontal" alignment="center" flex={1} paddingVertical="ExtraLarge">
          <Text variant="body" color="TextSubdued">
            Loading companies...
          </Text>
        </Stack>
      )}
      {companiesQuery.isSuccess && rows.length === 0 && (
        <Stack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
          <Text variant="body" color="TextSubdued">
            No companies found
          </Text>
        </Stack>
      )}
      {companiesQuery.isError && (
        <Stack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
          <Text color="TextCritical" variant="body">
            {extractErrorMessage(companiesQuery.error, 'Error loading companies')}
          </Text>
        </Stack>
      )}
    </ScrollView>
  );
}

function useCompanyRows(
  companies: Company[],
  onSelect: (companyId: ID, customerId: ID, companyContactId: ID, companyLocationId: ID) => void,
): ListRow[] {
  const router = useRouter();

  return companies.map<ListRow>(company => {
    const disabled = !company.mainContact;

    return {
      id: company.id,
      onPress: async () => {
        if (!company.mainContact) {
          return;
        }

        const { mainContact } = company;

        await router.popCurrent();
        router.push('CompanyLocationSelector', {
          companyId: company.id,
          onSelect: location => onSelect(company.id, mainContact.customer.id, mainContact.id, location.id),
        });
      },
      leftSide: {
        label: company.name,
        subtitle: [company.mainContact?.customer.displayName ?? 'No company contact'],
      },
      rightSide: {
        showChevron: !disabled,
      },
    };
  });
}
