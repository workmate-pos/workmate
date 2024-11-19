import { useState } from 'react';
import { List, ListRow, ScrollView, Stack, Text, useApi } from '@shopify/ui-extensions-react/point-of-sale';
import { useRouter } from '../routes.js';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { ControlledSearchBar } from '@teifi-digital/pos-tools/components/ControlledSearchBar.js';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { useVendorsQuery, Vendor } from '@work-orders/common/queries/use-vendors-query.js';

export function VendorSelector({ onSelect }: { onSelect: (vendorName: string) => void }) {
  const [query, setQuery] = useState('');

  const fetch = useAuthenticatedFetch();
  const vendorsQuery = useVendorsQuery({ fetch });
  const vendors = vendorsQuery.data ?? [];

  const rows = useVendorRows(vendors, query, onSelect);

  return (
    <ScrollView>
      <Stack direction="horizontal" alignment="center" flex={1} paddingHorizontal={'HalfPoint'}>
        <Text variant="body" color="TextSubdued">
          {vendorsQuery.isRefetching ? 'Reloading...' : ' '}
        </Text>
      </Stack>
      <ControlledSearchBar
        value={query}
        onTextChange={(query: string) => setQuery(query)}
        onSearch={() => {}}
        placeholder="Search vendors"
      />
      <List data={rows} />
      {vendorsQuery.isLoading && (
        <Stack direction="horizontal" alignment="center" flex={1} paddingVertical="ExtraLarge">
          <Text variant="body" color="TextSubdued">
            Loading vendors...
          </Text>
        </Stack>
      )}
      {vendorsQuery.isSuccess && rows.length === 0 && (
        <Stack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
          <Text variant="body" color="TextSubdued">
            No vendors found
          </Text>
        </Stack>
      )}
      {vendorsQuery.isError && (
        <Stack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
          <Text color="TextCritical" variant="body">
            {extractErrorMessage(vendorsQuery.error, 'Error loading vendors')}
          </Text>
        </Stack>
      )}
    </ScrollView>
  );
}

function useVendorRows(vendors: Vendor[], query: string, onSelect: (vendorName: string) => void) {
  query = query.trim();

  const queryFilter = (vendor: Vendor) => {
    return !query || vendor.name.toLowerCase().includes(query.toLowerCase());
  };

  const router = useRouter();

  return vendors.filter(queryFilter).map<ListRow>(vendor => ({
    id: vendor.name,
    onPress: () => {
      onSelect(vendor.name);
      router.popCurrent();
    },
    leftSide: {
      label: vendor.name,
    },
    rightSide: {
      showChevron: true,
    },
  }));
}
