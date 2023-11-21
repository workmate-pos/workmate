import { List, ListRow, ScrollView, SearchBar, Stack, Text } from '@shopify/retail-ui-extensions-react';
import { useScreen } from '../../hooks/use-screen';
import { useEffect, useState } from 'react';
import { Employee, useEmployeesQuery } from '../../queries/use-employees-query';
import { useDebouncedState } from '../../hooks/use-debounced-state';

export function EmployeeSelector() {
  const { Screen, closePopup } = useScreen('EmployeeSelector');

  const [query, setQuery] = useState('');
  const [reloading, setReloading] = useDebouncedState(false);
  const [loadMore, setLoadMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const employeesQuery = useEmployeesQuery({
    offset: employees.length,
    enabled: loadMore,
    query,
  });

  useEffect(() => {
    if (reloading) return;

    const { data } = employeesQuery;
    if (data === undefined) return;

    if (data === null) {
      setError('Error loading employees');
    } else {
      setEmployees(prevEmployees => [...prevEmployees, ...data.employees]);
    }

    setLoadMore(false);
  }, [employeesQuery.data]);

  useEffect(() => {
    if (reloading) {
      setEmployees([]);
      setLoadMore(true);
      setReloading(false, true);
    } else {
      employeesQuery.remove();
    }
  }, [reloading]);

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
        <SearchBar
          onTextChange={query => {
            setQuery(query);
            setReloading(true, !query);
          }}
          onSearch={() => {}}
          placeholder="Search employees"
        />
        <List data={rows} />
        {employeesQuery.isLoading && (
          <Stack direction="horizontal" alignment="center" flex={1} paddingVertical="ExtraLarge">
            <Text variant="body" color="TextSubdued">
              Loading customers...
            </Text>
          </Stack>
        )}
        {!employeesQuery.isLoading && !error && rows.length === 0 && (
          <Stack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
            <Text variant="body" color="TextSubdued">
              No customers found
            </Text>
          </Stack>
        )}
        {error && (
          <Stack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
            <Text color="TextCritical" variant="body">
              {error}
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
