import { List, ListRow, ScrollView, SearchBar } from '@shopify/retail-ui-extensions-react';
import { useScreen } from '../../hooks/use-screen';
import { useMemo, useState } from 'react';

const names = [
  'Madelynn Flynn',
  'Donna Adams',
  'Alisha Morgan',
  'Guillermo Hutchinson',
  'Alberto Moyer',
  'Adrian Hamilton',
  'Myah Fitzpatrick',
  'Kolten Hopkins',
  'Brett Fritz',
  'Joy Campos',
  'Emilee Martin',
  'Luis Young',
];

const employeeTypes = ['Manager', 'Sales', 'Tailor', 'Seamstress', 'Alterations', 'Presser', 'Customer Service'];

export function EmployeeSelector() {
  const { Screen, closePopup } = useScreen('EmployeeSelector');

  const [query, setQuery] = useState<string | null>(null);

  const employees = useMemo(
    () =>
      names.map((name, i) => ({
        name,
        employeeId: String(i),
        type: employeeTypes[Math.floor(Math.random() * employeeTypes.length)],
        assignments: Math.floor(Math.random() * 10),
      })),
    [],
  );

  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);

  const employeeRows = employees
    .filter(({ name }) => !query || name.toLowerCase().includes(query.toLowerCase()))
    .map<ListRow>(({ employeeId, name, type, assignments }) => ({
      id: employeeId,
      onPress: () => {
        const selected = selectedEmployees.includes(employeeId);
        if (selected) {
          setSelectedEmployees(selectedEmployees.filter(e => e !== employeeId));
        } else {
          setSelectedEmployees([...selectedEmployees, employeeId]);
        }
      },
      leftSide: {
        label: name,
        badges: [
          {
            text: type,
            variant: 'highlight',
          },
          {
            text: `${assignments} assignments`,
            variant:
              assignments > 7 ? 'critical' : assignments > 3 ? 'warning' : assignments === 0 ? 'success' : 'neutral',
            status: assignments === 0 ? 'empty' : assignments === 10 ? 'complete' : 'partial',
          },
        ],
      },
      rightSide: {
        toggleSwitch: {
          value: selectedEmployees.includes(employeeId),
        },
      },
    }));

  const close = () => {
    const selected = employees.filter(e => selectedEmployees.includes(e.employeeId));
    closePopup(selected);
  };

  return (
    <Screen title="Select employee" presentation={{ sheet: true }} overrideNavigateBack={close}>
      <ScrollView>
        <SearchBar onTextChange={setQuery} onSearch={() => {}} placeholder="Search employees" />
        <List data={employeeRows} />
      </ScrollView>
    </Screen>
  );
}
