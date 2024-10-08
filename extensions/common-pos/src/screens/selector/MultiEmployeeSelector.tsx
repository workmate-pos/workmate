import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { Employee, useEmployeesQuery } from '@work-orders/common/queries/use-employees-query.js';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import { useDebouncedState } from '../../hooks/use-debounced-state.js';
import { UseRouter } from '../router.js';
import { ListPopup } from '../ListPopup.js';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { getEmployeeItem } from './EmployeeSelector.js';

export type MultiEmployeeSelectorProps = {
  onSelect: (employees: Employee[]) => void;
  initialSelection?: ID[];
  disabled?: ID[];
  useRouter: UseRouter;
};

export function MultiEmployeeSelector({ onSelect, initialSelection, disabled, useRouter }: MultiEmployeeSelectorProps) {
  const fetch = useAuthenticatedFetch();
  const [query, setQuery] = useDebouncedState('');
  const employeesQuery = useEmployeesQuery({ fetch, params: { query } });

  const employees = employeesQuery.data?.pages.flat() ?? [];

  return (
    <ListPopup
      title={'Select employee'}
      query={{ query, setQuery }}
      resourceName={{ singular: 'employee', plural: 'employees' }}
      isLoadingMore={employeesQuery.isFetching}
      onEndReached={() => employeesQuery.fetchNextPage()}
      selection={{
        type: 'multi-select',
        items: employees.map(employee => ({
          ...getEmployeeItem(employee),
          disabled: disabled?.includes(employee.id) ?? false,
        })),
        initialSelection,
        onSelect: employeeIds =>
          onSelect(employeeIds.map(id => employees.find(employee => employee.id === id) ?? never())),
      }}
      useRouter={useRouter}
    />
  );
}
