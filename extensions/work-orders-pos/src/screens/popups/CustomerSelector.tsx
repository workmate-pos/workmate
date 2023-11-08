import { useScreen } from '../../hooks/use-screen';
import { useMemo, useState } from 'react';
import { List, ListRow, ScrollView, SearchBar } from '@shopify/retail-ui-extensions-react';

// TODO: load from database
const names = [
  'Sophia Johnson',
  'Ethan Davis',
  'Olivia Bennett',
  'William Carter',
  'Ava Nelson',
  'James Mitchell',
  'Emma Williams',
  'Benjamin White',
  'Isabella Parker',
  'Mason Turner',
  'Charlotte Smith',
  'Liam Anderson',
];

export function CustomerSelector() {
  const { Screen, closePopup } = useScreen('CustomerSelector');

  const [query, setQuery] = useState<string | null>(null);

  const customers = useMemo(
    () =>
      names.map((name, i) => ({
        name,
        id: String(i),
      })),
    [],
  );

  const customerRows = customers.map<ListRow>(({ id, name }) => ({
    id,
    onPress: () => {
      closePopup({ id, name });
    },
    leftSide: {
      label: name,
    },
    rightSide: {
      showChevron: true,
    },
  }));

  return (
    <Screen title="Select Customer">
      <ScrollView>
        <SearchBar onTextChange={setQuery} onSearch={() => {}} placeholder="Search customers" />
        <List data={customerRows} />
      </ScrollView>
    </Screen>
  );
}
