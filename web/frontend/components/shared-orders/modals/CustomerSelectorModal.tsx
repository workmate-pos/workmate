import { ToastActionCallable } from '@teifi-digital/shopify-app-react';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { useState } from 'react';
import { useCustomersQuery } from '@work-orders/common/queries/use-customers-query.js';
import { Filters, Modal, ResourceItem, ResourceList, Text } from '@shopify/polaris';
import { useDebouncedState } from '@web/frontend/hooks/use-debounced-state.js';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';

export function CustomerSelectorModal({
  open,
  onClose,
  onSelect,
  setToastAction,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (customerId: ID) => void;
  setToastAction: ToastActionCallable;
}) {
  const [query, setQuery, optimisticQuery] = useDebouncedState('');
  const [page, setPage] = useState(0);

  const fetch = useAuthenticatedFetch({ setToastAction });
  const customersQuery = useCustomersQuery({ fetch, params: { query } });
  const customers = customersQuery.data?.pages?.[page] ?? [];

  const isLastAvailablePage = customersQuery.data && page === customersQuery.data.pages.length - 1;
  const hasNextPage = !isLastAvailablePage || customersQuery.hasNextPage;

  return (
    <Modal open={open} title={'Select Customer'} onClose={onClose}>
      <ResourceList
        items={customers}
        resourceName={{ singular: 'customer', plural: 'customers' }}
        resolveItemId={customer => customer.id}
        loading={customersQuery.isLoading || customersQuery.isFetchingNextPage}
        pagination={{
          hasNext: hasNextPage,
          hasPrevious: page > 0,
          onPrevious: () => setPage(page => page - 1),
          onNext: () => {
            if (isLastAvailablePage) {
              customersQuery.fetchNextPage();
            }

            setPage(page => page + 1);
          },
        }}
        filterControl={
          <Filters
            filters={[]}
            queryPlaceholder={'Search customers'}
            queryValue={optimisticQuery}
            onQueryChange={setQuery}
            onQueryClear={() => setQuery('', true)}
            onClearAll={() => setQuery('', true)}
          />
        }
        renderItem={customer => (
          <ResourceItem
            id={customer.id}
            onClick={() => {
              onSelect(customer.id);
              onClose();
            }}
          >
            <Text as={'p'} variant={'bodyMd'} fontWeight={'bold'}>
              {customer.displayName}
            </Text>
            <Text as={'p'} variant={'bodyMd'} tone={'subdued'}>
              {customer?.defaultAddress?.formatted?.join(', ')}
            </Text>
          </ResourceItem>
        )}
      />
    </Modal>
  );
}