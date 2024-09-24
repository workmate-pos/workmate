import { ToastActionCallable } from '@teifi-digital/shopify-app-react';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { useCompaniesQuery } from '@work-orders/common/queries/use-companies-query.js';
import { useStorePropertiesQuery } from '@work-orders/common/queries/use-store-properties-query.js';
import { SHOPIFY_B2B_PLANS } from '@work-orders/common/util/shopify-plans.js';
import { Filters, Modal, ResourceItem, ResourceList, Text } from '@shopify/polaris';
import { useDebouncedState } from '@web/frontend/hooks/use-debounced-state.js';

export function CompanySelectorModal({
  open,
  onClose,
  onSelect,
  setToastAction,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (companyId: ID, customerId: ID, companyContactId: ID) => void;
  setToastAction: ToastActionCallable;
}) {
  const [query, setQuery] = useDebouncedState('');

  const fetch = useAuthenticatedFetch({ setToastAction });

  const companiesQuery = useCompaniesQuery({ fetch, params: { query } });
  const companies = companiesQuery.data?.pages.flat() ?? [];

  // TODO: Wait for this before doing company queries
  const storePropertiesQuery = useStorePropertiesQuery({ fetch });
  const storeProperties = storePropertiesQuery.data?.storeProperties;

  const canSelectCompany =
    !!storeProperties && !!storeProperties.plan && SHOPIFY_B2B_PLANS.includes(storeProperties.plan);

  return (
    <Modal open={open} title={'Select Company'} onClose={onClose}>
      {!canSelectCompany && (
        <Modal.Section>
          <Text as={'p'} variant={'bodyMd'} tone={'critical'}>
            Your Shopify plan does not support B2B features
          </Text>
        </Modal.Section>
      )}

      <Modal.Section>
        <ResourceList
          items={companies}
          resourceName={{ singular: 'company', plural: 'companies' }}
          resolveItemId={company => company.id}
          loading={companiesQuery.isLoading || companiesQuery.isFetchingNextPage}
          pagination={{
            hasNext: companiesQuery.hasNextPage,
            hasPrevious: companiesQuery.hasPreviousPage,
            onPrevious: () => companiesQuery.fetchPreviousPage(),
            onNext: () => companiesQuery.fetchNextPage(),
          }}
          filterControl={
            <Filters
              filters={[]}
              queryPlaceholder={'Search companies'}
              queryValue={query}
              onQueryChange={setQuery}
              onQueryClear={() => setQuery('', true)}
              onClearAll={() => setQuery('', true)}
            />
          }
          renderItem={company => (
            <ResourceItem
              id={company.id}
              disabled={!company.mainContact}
              onClick={() => {
                if (!company.mainContact) {
                  return;
                }

                onSelect(company.id, company.mainContact.customer.id, company.mainContact.id);
                onClose();
              }}
            >
              <Text as={'p'} variant={'bodyMd'} fontWeight={'bold'}>
                {company.name}
              </Text>
              <Text as={'p'} variant={'bodyMd'} tone={'subdued'}>
                {company.mainContact?.customer.displayName ?? 'Unavailable - no company contact'}
              </Text>
            </ResourceItem>
          )}
        />
      </Modal.Section>
    </Modal>
  );
}
