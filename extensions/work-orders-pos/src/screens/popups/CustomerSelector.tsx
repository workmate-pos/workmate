import { ClosePopupFn, useScreen } from '../../hooks/use-screen';
import { useEffect, useState } from 'react';
import { List, ListRow, ScrollView, SearchBar, Stack, Text } from '@shopify/retail-ui-extensions-react';
import { Customer, useCustomersQuery } from '../../queries/use-customers-query';
import { useDebouncedState } from '../../hooks/use-debounced-state';

export function CustomerSelector() {
  const { Screen, closePopup } = useScreen('CustomerSelector');

  const [reloading, setReloading] = useDebouncedState(false);
  const [loadMore, setLoadMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const customersQuery = useCustomersQuery({
    offset: customers.length,
    enabled: loadMore,
    query,
  });

  useEffect(() => {
    if (reloading) return;

    const { data } = customersQuery;
    if (data === undefined) return;

    if (data === null) {
      setError('Error loading customers');
    } else {
      setCustomers(prev => [...prev, ...data.customers]);
    }

    setLoadMore(false);
  }, [customersQuery.data]);

  useEffect(() => {
    if (reloading) {
      setCustomers([]);
      setLoadMore(true);
      setReloading(false, true);
    } else {
      customersQuery.remove();
    }
  }, [reloading]);

  const rows = getCustomerRows(customers, closePopup);

  return (
    <Screen title="Select Customer" presentation={{ sheet: true }}>
      <ScrollView>
        <SearchBar
          onTextChange={query => {
            setQuery(query);
            setReloading(true, !query);
          }}
          onSearch={() => {}}
          placeholder="Search customers"
        />
        <List data={rows} onEndReached={() => setLoadMore(true)} isLoadingMore={customersQuery.isLoading} />
        {customersQuery.isLoading && (
          <Stack direction="horizontal" alignment="center" flex={1} paddingVertical="ExtraLarge">
            <Text variant="body" color="TextSubdued">
              Loading customers...
            </Text>
          </Stack>
        )}
        {!customersQuery.isLoading && !error && rows.length === 0 && (
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

function getCustomerRows(customers: Customer[], closePopup: ClosePopupFn<'CustomerSelector'>): ListRow[] {
  return customers.map<ListRow>(({ id, name }) => ({
    id,
    onPress: () => {
      closePopup({ id, name });
    },
    leftSide: {
      label: name,
      // TODO
      // subtitle: ['info here'],
    },
    rightSide: {
      showChevron: true,
    },
  }));
}
