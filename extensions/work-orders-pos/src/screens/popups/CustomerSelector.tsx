import { ClosePopupFn, useScreen } from '../../hooks/use-screen';
import { useEffect, useState } from 'react';
import { List, ListRow, ScrollView, SearchBar } from '@shopify/retail-ui-extensions-react';
import { Customer, useCustomersQuery } from '../../queries/use-customers-query';

export function CustomerSelector() {
  const { Screen, closePopup } = useScreen('CustomerSelector');

  const [loadMore, setLoadMore] = useState(true);
  const [query, setQuery] = useState<string | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const customersQuery = useCustomersQuery({ offset: customers.length, enabled: loadMore });

  useEffect(() => {
    const { data } = customersQuery;
    if (!data) return;

    setCustomers(prev => [...prev, ...data.customers]);
    setLoadMore(false);
  }, [customersQuery.data]);

  const rows = getCustomerRows(customers, closePopup);

  return (
    <Screen title="Select Customer" presentation={{ sheet: true }}>
      <ScrollView>
        <SearchBar onTextChange={setQuery} onSearch={() => {}} placeholder="Search customers" />
        <List data={rows} onEndReached={() => setLoadMore(true)} isLoadingMore={customersQuery.isLoading} />
      </ScrollView>
    </Screen>
  );
}

function getCustomerRows(customers: Customer[], closePopup: ClosePopupFn<'CustomerSelector'>): ListRow[] {
  return customers.map<ListRow>(({ id, name }) => ({
    id,
    onPress: () => {
      closePopup({ id, name });
    },
    leftSide: {
      label: name,
      subtitle: ['info here'],
    },
    rightSide: {
      showChevron: true,
    },
  }));
}
