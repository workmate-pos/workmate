import { ClosePopupFn, useScreen } from '@work-orders/common-pos/hooks/use-screen.js';
import { useAuthenticatedFetch } from '@work-orders/common-pos/hooks/use-authenticated-fetch.js';
import { useVendorsQuery, Vendor } from '@work-orders/common/queries/use-vendors-query.js';
import { useState } from 'react';
import { List, ListRow, ScrollView, Stack, Text } from '@shopify/retail-ui-extensions-react';
import { ControlledSearchBar } from '@work-orders/common-pos/components/ControlledSearchBar.js';
import { extractErrorMessage } from '@work-orders/common-pos/util/errors.js';
import { getFormattedAddressSubtitle } from '../../util/formatted-address-subtitle.js';

export function VendorSelector() {
  const [query, setQuery] = useState('');

  const { Screen, closePopup } = useScreen('VendorSelector', () => {
    setQuery('');
  });

  const fetch = useAuthenticatedFetch();
  const vendorsQuery = useVendorsQuery({ fetch });
  const vendors = vendorsQuery.data ?? [];

  const rows = getVendorRows(vendors, query, closePopup);

  return (
    <Screen title={'Select Vendor'} presentation={{ sheet: true }}>
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
    </Screen>
  );
}

function getVendorRows(vendors: Vendor[], query: string, selectVendor: ClosePopupFn<'VendorSelector'>) {
  query = query.trim();

  const queryFilter = (vendor: Vendor) => {
    return !query || vendor.name.toLowerCase().includes(query.toLowerCase());
  };

  return vendors.filter(queryFilter).map<ListRow>(vendor => ({
    id: vendor.name,
    onPress: () =>
      selectVendor({
        vendorName: vendor.name,
        vendorCustomerId: vendor.customer?.customerId ?? null,
      }),
    leftSide: {
      label: vendor.name,
      subtitle: vendor.customer?.defaultAddress
        ? getFormattedAddressSubtitle(vendor.customer.defaultAddress.formatted)
        : undefined,
    },
    rightSide: {
      showChevron: true,
    },
  }));
}
