import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { useState } from 'react';
import { List, ListRow, ScrollView, Stack, Text, useExtensionApi } from '@shopify/retail-ui-extensions-react';
import { useRouter } from '../routes.js';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { ControlledSearchBar } from '@teifi-digital/pos-tools/components/ControlledSearchBar.js';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { useVendorsQuery, Vendor } from '@work-orders/common/queries/use-vendors-query.js';
import { useScreen } from '@teifi-digital/pos-tools/router';
import { useProductVariantsQuery } from '@work-orders/common/queries/use-product-variants-query.js';
import { Int } from '@web/schemas/generated/create-product.js';

export function VendorSelector({ onSelect }: { onSelect: (vendorName: string, productVariantIds: ID[]) => void }) {
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

function useVendorRows(
  vendors: Vendor[],
  query: string,
  onSelect: (vendorName: string, productVariantIds: ID[]) => void,
) {
  query = query.trim();

  const queryFilter = (vendor: Vendor) => {
    return !query || vendor.name.toLowerCase().includes(query.toLowerCase());
  };

  const router = useRouter();
  const fetch = useAuthenticatedFetch();
  const screen = useScreen();

  const { session } = useExtensionApi<'pos.home.modal.render'>();

  const [vendorName, setVendorName] = useState<string>();
  const productVariantsQuery = useProductVariantsQuery({
    fetch,
    params: { query: `vendor:"${vendorName}" AND location_id:${session.currentSession.locationId}`, first: 50 as Int },
    options: { enabled: !!vendorName },
  });

  screen.setIsLoading(!!vendorName);

  if (vendorName && !productVariantsQuery.isFetching) {
    if (productVariantsQuery.hasNextPage || productVariantsQuery.isIdle) {
      productVariantsQuery.fetchNextPage();
    } else {
      setVendorName(undefined);
      screen.setIsLoading(false);
      onSelect(vendorName, productVariantsQuery.data?.pages.flat().map(pv => pv.id) ?? []);
      router.popCurrent();
    }
  }

  return vendors.filter(queryFilter).map<ListRow>(vendor => ({
    id: vendor.name,
    onPress: () => {
      setVendorName(vendor.name);
    },
    leftSide: {
      label: vendor.name,
    },
    rightSide: {
      showChevron: true,
    },
  }));
}
