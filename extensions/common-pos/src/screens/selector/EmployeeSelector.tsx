import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { Employee, useEmployeesQuery } from '@work-orders/common/queries/use-employees-query.js';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import { useDebouncedState } from '../../hooks/use-debounced-state.js';
import { UseRouter } from '../router.js';
import { ListPopup } from '../ListPopup.js';
import { getSubtitle } from '../../util/subtitle.js';

export type EmployeeSelectorProps = {
  onSelect: (employee: Employee) => void;
  onClear?: () => void;
  useRouter: UseRouter;
};

export function EmployeeSelector({ onSelect, onClear, useRouter }: EmployeeSelectorProps) {
  const fetch = useAuthenticatedFetch();
  const [query, setQuery] = useDebouncedState('');
  const employeesQuery = useEmployeesQuery({ fetch, params: { query } });

  const employees = employeesQuery.data?.pages.flat() ?? [];

  return (
    <ListPopup
      title={'Select Employee'}
      query={{ query, setQuery }}
      isLoadingMore={employeesQuery.isFetching}
      onEndReached={() => employeesQuery.fetchNextPage()}
      selection={{
        type: 'select',
        items: [
          onClear ? { id: '', leftSide: { label: 'Clear' } } : null,
          ...employees.map(employee => getEmployeeItem(employee)),
        ].filter(isNonNullable),
        onSelect: employeeId =>
          employeeId === '' ? onClear?.() : onSelect(employees.find(employee => employee.id === employeeId) ?? never()),
      }}
      useRouter={useRouter}
    />
  );
}

export function getEmployeeItem(employee: Employee) {
  return {
    id: employee.id,
    leftSide: {
      label: employee.name,
      subtitle: getSubtitle([employee.email]),
    },
  };
}
