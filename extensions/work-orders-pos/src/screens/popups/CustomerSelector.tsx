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

const getCustomerEmail = (name: string) => {
  return `${name.replace(' ', '-').replace(/[A-Z]/g, l => l.toLowerCase())}@shopify.com`;
};

const getCustomerPhoneNumber = (name: string) => {
  const seed = [...name].map(l => l.charCodeAt(0)).reduce((sum, n) => sum + n, 0);
  const areaCode = (seed % 800) + 200;
  const exchange = ((areaCode + 231) % 800) + 100;
  const subscriber = (seed % 8000) + 2000;
  return `+1 ${areaCode}-${exchange}-${subscriber}`;
};

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
      subtitle: [getCustomerEmail(name), getCustomerPhoneNumber(name)],
    },
    rightSide: {
      showChevron: true,
    },
  }));

  return (
    <Screen title="Select Customer" presentation={{ sheet: true }}>
      <ScrollView>
        <SearchBar onTextChange={setQuery} onSearch={() => {}} placeholder="Search customers" />
        <List data={customerRows} />
      </ScrollView>
    </Screen>
  );
}
