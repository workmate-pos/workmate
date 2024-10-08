import { assertGid, ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { ToastActionCallable } from '@teifi-digital/shopify-app-react';
import { useState } from 'react';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { useEmployeesQuery } from '@work-orders/common/queries/use-employees-query.js';
import { useEmployeeQueries } from '@work-orders/common/queries/use-employee-query.js';
import { isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { Modal, ResourceItem, ResourceList, Text } from '@shopify/polaris';

export function AddEmployeeModal({
  open,
  onClose,
  onUpdate,
  selectedEmployeeIds,
  setToastAction,
}: {
  open: boolean;
  onClose: () => void;
  onUpdate: (selectedEmployeeIds: ID[]) => void;
  selectedEmployeeIds: ID[];
  setToastAction: ToastActionCallable;
}) {
  const [page, setPage] = useState(0);

  const fetch = useAuthenticatedFetch({ setToastAction });
  const employeesQuery = useEmployeesQuery({ fetch, params: {} });
  const employees =
    employeesQuery.data?.pages?.[page]?.filter(employee => !selectedEmployeeIds.includes(employee.id)) ?? [];

  const employeeQueries = useEmployeeQueries({ fetch, ids: selectedEmployeeIds });
  const selectedEmployees = selectedEmployeeIds.map(id => employeeQueries[id]?.data).filter(isNonNullable);

  const items = [...selectedEmployees, ...employees];

  const isLastAvailablePage = employeesQuery.data && page === employeesQuery.data.pages.length - 1;
  const hasNextPage = !isLastAvailablePage || employeesQuery.hasNextPage;

  return (
    <Modal open={open} title={'Assign employees'} onClose={onClose}>
      <ResourceList
        items={items}
        resourceName={{ plural: 'employees', singular: 'employee' }}
        resolveItemId={employee => employee.id}
        loading={
          Object.values(employeeQueries).some(query => query.isLoading) ||
          employeesQuery.isLoading ||
          employeesQuery.isFetchingNextPage
        }
        pagination={{
          hasNext: hasNextPage,
          hasPrevious: page > 0,
          onPrevious: () => setPage(page => page - 1),
          onNext: () => {
            if (isLastAvailablePage) {
              employeesQuery.fetchNextPage();
            }

            setPage(page => page + 1);
          },
        }}
        selectable
        selectedItems={selectedEmployeeIds}
        onSelectionChange={selectedEmployeeIds => {
          if (selectedEmployeeIds === 'All') {
            return onUpdate(items.map(item => item.id));
          }

          onUpdate(
            selectedEmployeeIds.map(id => {
              assertGid(id);
              return id;
            }),
          );
        }}
        renderItem={employee => {
          const isSelected = selectedEmployeeIds.includes(employee.id);

          const onClick = () => {
            if (isSelected) {
              onUpdate(selectedEmployeeIds.filter(id => id !== employee.id));
            } else {
              onUpdate([...selectedEmployeeIds, employee.id]);
            }
          };

          return (
            <ResourceItem id={employee.id} key={employee.id} onClick={onClick}>
              <Text as={'p'} variant={'bodyMd'} fontWeight={'bold'}>
                {employee.name}
              </Text>
            </ResourceItem>
          );
        }}
      />
    </Modal>
  );
}
