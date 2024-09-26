import { useDebouncedState } from '@web/frontend/hooks/use-debounced-state.js';
import { useToast } from '@teifi-digital/shopify-app-react';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { Employee, useEmployeesQuery } from '@work-orders/common/queries/use-employees-query.js';
import {
  BlockStack,
  Card,
  EmptyState,
  Filters,
  InlineStack,
  Modal,
  ResourceItem,
  ResourceList,
  Text,
} from '@shopify/polaris';
import { useState } from 'react';
import { getInfiniteQueryPagination } from '@web/frontend/util/pagination.js';
import { emptyState } from '@web/frontend/assets/index.js';

export type StaffMemberSelectorModalProps = {
  open: boolean;
  onClose: () => void;
  onSelect: (staffMemberId: Employee) => void;
};

export function StaffMemberSelectorModal({ open, onClose, onSelect }: StaffMemberSelectorModalProps) {
  const [query, setQuery, optimisticQuery] = useDebouncedState('');

  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });

  const staffMembersQuery = useEmployeesQuery({
    fetch,
    params: { query, first: 50 },
  });

  const [pageIndex, setPageIndex] = useState(0);
  const pagination = getInfiniteQueryPagination(pageIndex, setPageIndex, staffMembersQuery);
  const page = staffMembersQuery.data?.pages[pageIndex] ?? [];

  return (
    <>
      <Modal open={open} title={'Select Staff Member'} onClose={onClose}>
        <ResourceList
          items={page}
          resourceName={{ singular: 'staff member', plural: 'staff members' }}
          loading={staffMembersQuery.isFetching}
          pagination={{
            hasNext: pagination.hasNextPage,
            hasPrevious: pagination.hasPreviousPage,
            onNext: pagination.next,
            onPrevious: pagination.previous,
          }}
          filterControl={
            <Filters
              queryValue={optimisticQuery}
              queryPlaceholder={'Search staff members'}
              filters={[]}
              onQueryChange={setQuery}
              onQueryClear={() => setQuery('', true)}
              onClearAll={() => setQuery('', true)}
            />
          }
          emptyState={
            <Card>
              <EmptyState heading={'Staff Members'} image={emptyState}>
                No staff members found
              </EmptyState>
            </Card>
          }
          renderItem={staffMember => {
            return (
              <ResourceItem
                id={staffMember.id}
                onClick={() => {
                  onSelect(staffMember);
                  onClose();
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
            );
          }}
        />
      </Modal>

      {toast}
    </>
  );
}
