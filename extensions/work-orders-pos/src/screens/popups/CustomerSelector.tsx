import { List, ListRow, ScrollView, Stack, Text } from '@shopify/retail-ui-extensions-react';
import { useDebouncedState } from '@work-orders/common/hooks/use-debounced-state.js';
import { useCustomersQuery, Customer } from '@work-orders/common/queries/use-customers-query.js';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { ControlledSearchBar } from '@teifi-digital/pos-tools/components/ControlledSearchBar.js';
import { extractErrorMessage } from '@teifi-digital/pos-tools/utils/errors.js';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';

export function CustomerSelector({ onSelect }: { onSelect: (id: ID) => void }) {
  const [query, setQuery] = useDebouncedState('');

  const fetch = useAuthenticatedFetch();
  const customersQuery = useCustomersQuery({ fetch, params: { query } });
  const customers = customersQuery.data?.pages ?? [];

  const rows = getCustomerRows(customers, onSelect);

  return (
    <ScrollView>
      <Stack direction="horizontal" alignment="center" flex={1} paddingHorizontal={'HalfPoint'}>
        <Text variant="body" color="TextSubdued">
          {customersQuery.isRefetching ? 'Reloading...' : ' '}
        </Text>
      </Stack>
      <ControlledSearchBar
        value={query}
        onTextChange={(query: string) => setQuery(query, query === '')}
        onSearch={() => {}}
        placeholder="Search customers"
      />
      <List data={rows} onEndReached={() => customersQuery.fetchNextPage()} isLoadingMore={customersQuery.isLoading} />
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
            {extractErrorMessage(customersQuery.error, 'Error loading customers')}
          </Text>
        </Stack>
      )}
    </ScrollView>
  );
}

function getCustomerRows(customers: Customer[], onSelect: (id: ID) => void) {
  return customers.map<ListRow>(({ id, displayName, email, phone, defaultAddress }) => ({
    id,
    onPress: () => onSelect(id),
    leftSide: {
      label: displayName,
      subtitle: [email ?? 'No email', phone ?? 'No phone', defaultAddress?.formatted?.[0] ?? 'No address'],
    },
    rightSide: {
      showChevron: true,
    },
  }));
}
