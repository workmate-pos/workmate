import { List, ListRow, ScrollView, SearchBar } from '@shopify/retail-ui-extensions-react';
import { useScreen } from '../../hooks/use-screen';
import { useEffect, useState } from 'react';
import { Employee, useEmployeesQuery } from '../../queries/use-employees-query';

export function EmployeeSelector() {
  const { Screen, closePopup } = useScreen('EmployeeSelector');

  const [query, setQuery] = useState<string | null>(null);
  const [loadMore, setLoadMore] = useState(true);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const employeesQuery = useEmployeesQuery({ offset: employees.length, enabled: loadMore });

  useEffect(() => {
    const { data } = employeesQuery;
    if (!data) return;

    setEmployees(prevEmployees => [...prevEmployees, ...data.employees]);
    setLoadMore(true);
  }, [employeesQuery.data]);

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
        <List data={rows} />
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
