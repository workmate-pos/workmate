import { List, ListRow, ScrollView, SearchBar } from '@shopify/retail-ui-extensions-react';
import { useScreen } from '../../hooks/use-screen';
import { useState } from 'react';

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

export const EmployeeSelector = () => {
  const { Screen, closePopup } = useScreen('EmployeeSelector');

  const [query, setQuery] = useState<string | null>(null);

  const employees = names
    .filter(name => !query || name.toLowerCase().includes(query.toLowerCase()))
    .map<ListRow>((name, i) => {
      const employeeType = employeeTypes[Math.floor(Math.random() * employeeTypes.length)];
      const assignments = Math.floor(Math.random() * 10);

      return {
        id: String(i),
        onPress: () => {
          closePopup({
            id: i,
            name,
          });
        },
        leftSide: {
          label: name,
          badges: [
            {
              text: employeeType,
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
          showChevron: true,
        },
      };
    });

  return (
    <Screen title="Select employee" presentation={{ sheet: true }}>
      <ScrollView>
        <SearchBar onTextChange={setQuery} onSearch={() => {}} placeholder="Search employees" />
        <List data={employees} />
      </ScrollView>
    </Screen>
  );
};
