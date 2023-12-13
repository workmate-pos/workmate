import { List, ListRow, ScrollView, SearchBar, Stack, Text } from '@shopify/retail-ui-extensions-react';
import { ClosePopupFn, useScreen } from '../../hooks/use-screen.js';
import { useDebouncedState } from '@common/hooks/use-debounced-state';
import { useCustomersQuery, Customer } from '@common/queries/use-customers-query';
import { useAuthenticatedFetch } from '../../hooks/use-authenticated-fetch';

export function CustomerSelector() {
  const { Screen, closePopup } = useScreen('CustomerSelector');

  const [query, setQuery] = useDebouncedState('');
  const fetch = useAuthenticatedFetch();
  const customersQuery = useCustomersQuery({ fetch, query });
  const customers = customersQuery.data?.pages ?? [];

  const rows = getCustomerRows(customers, closePopup);

  return (
    <Screen title="Select Customer" presentation={{ sheet: true }} onNavigate={() => setQuery('', true)}>
      <ScrollView>
        <Stack direction="horizontal" alignment="center" flex={1} paddingHorizontal={'HalfPoint'}>
          <Text variant="body" color="TextSubdued">
            {customersQuery.isRefetching ? 'Reloading...' : ' '}
          </Text>
        </Stack>
        <SearchBar
          onTextChange={query => setQuery(query, query === '')}
          onSearch={() => {}}
          placeholder="Search customers"
        />
        <List
          data={rows}
          onEndReached={() => customersQuery.fetchNextPage()}
          isLoadingMore={customersQuery.isLoading}
        />
        {customersQuery.isLoading && (
          <Stack direction="horizontal" alignment="center" flex={1} paddingVertical="ExtraLarge">
            <Text variant="body" color="TextSubdued">
              Loading customers...
            </Text>
          </Stack>
        )}
        {customersQuery.isSuccess && rows.length === 0 && (
          <Stack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
            <Text variant="body" color="TextSubdued">
              No customers found
            </Text>
          </Stack>
        )}
        {customersQuery.isError && (
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

function getCustomerRows(customers: Customer[], closePopup: ClosePopupFn<'CustomerSelector'>): ListRow[] {
  return customers.map<ListRow>(({ id, displayName: name }) => ({
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
