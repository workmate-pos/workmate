import { CreatePurchaseOrder } from '@web/schemas/generated/create-purchase-order.js';
import { useState } from 'react';
import { useDebouncedState } from '@work-orders/common/hooks/use-debounced-state.js';
import { useAuthenticatedFetch } from '@work-orders/common-pos/hooks/use-authenticated-fetch.js';
import { Employee, useEmployeesQuery } from '@work-orders/common/queries/use-employees-query.js';
import { List, ListRow, ScrollView, Stack, Text } from '@shopify/retail-ui-extensions-react';
import { ControlledSearchBar } from '@work-orders/common-pos/components/ControlledSearchBar.js';
import { extractErrorMessage } from '@work-orders/common-pos/util/errors.js';
import { useScreen } from '@work-orders/common-pos/router/controllable-screen.js';

export function EmployeeSelector({
  initialEmployeeAssignments,
  onSave,
}: {
  initialEmployeeAssignments: CreatePurchaseOrder['employeeAssignments'];
  onSave: (employees: CreatePurchaseOrder['employeeAssignments']) => void;
}) {
  const [selectedEmployees, setSelectedEmployees] = useState(initialEmployeeAssignments);
  const [query, setQuery] = useDebouncedState('');

  const fetch = useAuthenticatedFetch();
  const employeesQuery = useEmployeesQuery({ fetch, params: { query } });
  const employees = employeesQuery.data?.pages ?? [];

  const rows = getEmployeeRows(employees, query, selectedEmployees, setSelectedEmployees);

  const screen = useScreen();
  screen.addOverrideNavigateBack(() => onSave(selectedEmployees));

  return (
    <ScrollView>
      <Stack direction="horizontal" alignment="center" flex={1} paddingHorizontal={'HalfPoint'}>
        <Text variant="body" color="TextSubdued">
          {employeesQuery.isRefetching ? 'Reloading...' : ' '}
        </Text>
      </Stack>
      <ControlledSearchBar
        value={query}
        onTextChange={(query: string) => {
          setQuery(query, query === '');
        }}
        onSearch={() => {}}
        placeholder="Search employees"
      />
      <List data={rows} isLoadingMore={employeesQuery.isLoading} onEndReached={() => employeesQuery.fetchNextPage()} />
      {employeesQuery.isLoading && (
        <Stack direction="horizontal" alignment="center" flex={1} paddingVertical="ExtraLarge">
          <Text variant="body" color="TextSubdued">
            Loading employees...
          </Text>
        </Stack>
      )}
      {employeesQuery.isSuccess && rows.length === 0 && (
        <Stack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
          <Text variant="body" color="TextSubdued">
            No employees found
          </Text>
        </Stack>
      )}
      {employeesQuery.isError && (
        <Stack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
          <Text color="TextCritical" variant="body">
            {extractErrorMessage(employeesQuery.error, 'Error loading employees')}
          </Text>
        </Stack>
      )}
    </ScrollView>
  );
}

function getEmployeeRows(
  employees: Employee[],
  query: string,
  selectedEmployees: CreatePurchaseOrder['employeeAssignments'],
  setSelectedEmployees: (employees: CreatePurchaseOrder['employeeAssignments']) => void,
) {
  return employees.map<ListRow>(employee => {
    const selected = selectedEmployees.some(e => e.employeeId === employee.id);

    return {
      id: employee.id,
      onPress: () => {
        if (selected) {
          setSelectedEmployees(selectedEmployees.filter(e => e.employeeId !== employee.id));
        } else {
          setSelectedEmployees([...selectedEmployees, { employeeId: employee.id, employeeName: employee.name }]);
        }
      },
      leftSide: {
        label: employee.name,
      },
      rightSide: {
        toggleSwitch: {
          value: selected,
        },
      },
    };
  });
}
