import { List, ListRow, ScrollView, SearchBar, Stack, Text } from '@shopify/retail-ui-extensions-react';
import { useScreen } from '../../hooks/use-screen';
import { useState } from 'react';
import { Employee, useEmployeesQuery } from '../../queries/use-employees-query';
import { useDebouncedState } from '../../hooks/use-debounced-state';

export function EmployeeSelector() {
  const { Screen, closePopup } = useScreen('EmployeeSelector');

  const [query, setQuery] = useDebouncedState('');
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const employeesQuery = useEmployeesQuery({ query });
  const employees = employeesQuery.data?.pages ?? [];

  const rows = getEmployeeRows(employees, selectedEmployees, setSelectedEmployees);

  const close = () => {
    const selected = employees
      .filter(e => selectedEmployees.includes(e.id))
      .map(e => ({ employeeId: e.id, name: e.name }));

    closePopup(selected);
  };

  return (
    <Screen title="Select employee" presentation={{ sheet: true }} onNavigateBack={close}>
      <ScrollView>
        <SearchBar onTextChange={setQuery} onSearch={() => {}} placeholder="Search employees" />
        <List data={rows} isLoadingMore={employeesQuery.isLoading} />
        {employeesQuery.isLoading && (
          <Stack direction="horizontal" alignment="center" flex={1} paddingVertical="ExtraLarge">
            <Text variant="body" color="TextSubdued">
              Loading customers...
            </Text>
          </Stack>
        )}
        {employeesQuery.isSuccess && rows.length === 0 && (
          <Stack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
            <Text variant="body" color="TextSubdued">
              No customers found
            </Text>
          </Stack>
        )}
        {employeesQuery.isError && (
          <Stack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
            <Text color="TextCritical" variant="body">
              Error loading customers
            </Text>
          </Stack>
        )}
      </ScrollView>
    </Screen>
  );
}

function getEmployeeRows(
  employees: Employee[],
  selectedEmployeeIds: string[],
  setSelectedEmployees: (ids: string[]) => void,
) {
  return employees.map<ListRow>(({ id, name }) => ({
    id,
    onPress: () => {
      const selected = selectedEmployeeIds.includes(id);
      if (selected) {
        setSelectedEmployees(selectedEmployeeIds.filter(e => e !== id));
      } else {
        setSelectedEmployees([...selectedEmployeeIds, id]);
      }
    },
    leftSide: {
      label: name,
      badges: [
        // TODO: add badges
        // {
        //   text: `${assignments} assignments`,
        //   variant:
        //     assignments > 7 ? 'critical' : assignments > 3 ? 'warning' : assignments === 0 ? 'success' : 'neutral',
        //   status: assignments === 0 ? 'empty' : assignments === 10 ? 'complete' : 'partial',
        // },
      ],
    },
    rightSide: {
      toggleSwitch: {
        value: selectedEmployeeIds.includes(id),
      },
    },
  }));
}
