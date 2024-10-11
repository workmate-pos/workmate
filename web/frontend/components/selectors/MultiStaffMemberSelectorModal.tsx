import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { useToast } from '@teifi-digital/shopify-app-react';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { useDebouncedState } from '@web/frontend/hooks/use-debounced-state.js';
import { useEmployeesQuery } from '@work-orders/common/queries/use-employees-query.js';
import { useEffect, useState } from 'react';
import { getInfiniteQueryPagination } from '@web/frontend/util/pagination.js';
import { BlockStack, Filters, InlineStack, Modal, ResourceItem, ResourceList, Text } from '@shopify/polaris';
import { unique } from '@teifi-digital/shopify-app-toolbox/array';

export type MultiStaffMemberSelectorModalProps = {
  open: boolean;
  onClose: () => void;
  selected: ID[];
  onChange: (staffMemberIds: ID[]) => void;
};

export function MultiStaffMemberSelectorModal({
  open,
  onClose,
  selected,
  onChange,
}: MultiStaffMemberSelectorModalProps) {
  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });

  const [query, setQuery, optimisticQuery] = useDebouncedState('');

  const staffMembersQuery = useEmployeesQuery({
    fetch,
    params: { query, first: 50 },
  });

  const [pageIndex, setPageIndex] = useState(0);
  const pagination = getInfiniteQueryPagination(pageIndex, setPageIndex, staffMembersQuery);
  const page = staffMembersQuery.data?.pages[pageIndex] ?? [];

  useEffect(() => {
    setPageIndex(0);
  }, [query]);

  return (
    <>
      <Modal open={open} title={'Select staff members'} onClose={onClose}>
        <ResourceList
          items={page}
          resourceName={{ singular: 'staff member', plural: 'staff members' }}
          resolveItemId={staffMember => staffMember.id}
          loading={staffMembersQuery.isFetching}
          selectable
          pagination={{
            hasNext: pagination.hasNextPage,
            hasPrevious: pagination.hasPreviousPage,
            onNext: pagination.next,
            onPrevious: pagination.previous,
          }}
          filterControl={
            <Filters
              filters={[]}
              onQueryChange={query => setQuery(query, !query)}
              onQueryClear={() => setQuery('', true)}
              onClearAll={() => setQuery('', true)}
              queryValue={optimisticQuery}
              queryPlaceholder={'Search staff members'}
            />
          }
          onSelectionChange={staffMemberIds => {
            if (staffMemberIds === 'All') {
              onChange(
                unique([
                  ...selected,
                  ...(staffMembersQuery.data?.pages.flat().map(staffMember => staffMember.id) ?? []),
                ]),
              );
              return;
            } else {
              onChange(staffMemberIds.map(id => id as ID));
            }
          }}
          selectedItems={selected}
          renderItem={staffMember => (
            <ResourceItem
              id={staffMember.id}
              onClick={() => {
                const isSelected = selected.includes(staffMember.id);
                if (isSelected) {
                  onChange(selected.filter(id => id !== staffMember.id));
                } else {
                  onChange([...selected, staffMember.id]);
                }
              }}
            >
              <InlineStack gap="400">
                <BlockStack gap="200">
                  <Text as="p" variant="bodyMd" fontWeight="bold">
                    {staffMember.name}
                  </Text>
                  {!!staffMember.email && (
                    <Text as="p" variant="bodyMd" tone="subdued">
                      {staffMember.email}
                    </Text>
                  )}
                </BlockStack>
              </InlineStack>
            </ResourceItem>
          )}
        />
      </Modal>

      {toast}
    </>
  );
}
