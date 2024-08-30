import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { useVendorsQuery } from '@work-orders/common/queries/use-vendors-query.js';
import { useState } from 'react';
import { ListPopup } from '@work-orders/common-pos/screens/ListPopup.js';
import { useScreen } from '@teifi-digital/pos-tools/router';
import { useRouter } from '../../routes.js';
import { isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { getSubtitle } from '@work-orders/common-pos/util/subtitle.js';

export function VendorSelector({ onSelect, onClear }: { onSelect: (vendor: string) => void; onClear?: () => void }) {
  const fetch = useAuthenticatedFetch();
  const vendorsQuery = useVendorsQuery({ fetch });
  const [query, setQuery] = useState('');

  const screen = useScreen();
  screen.setIsLoading(vendorsQuery.isLoading);

  const vendors = vendorsQuery.data ?? [];

  return (
    <ListPopup
      title={'Select Vendor'}
      query={{ query, setQuery }}
      selection={{
        type: 'select',
        items: [
          onClear ? { id: '', leftSide: { label: 'Clear' } } : null,
          ...vendors
            .filter(vendor => !query || vendor.name.toLowerCase().includes(query.toLowerCase()))
            .map(vendor => ({
              id: vendor.name,
              leftSide: {
                label: vendor.name,
                subtitle: getSubtitle(vendor.customer?.defaultAddress?.formatted),
              },
            })),
        ].filter(isNonNullable),
        onSelect: vendor => (vendor === '' ? onClear?.() : onSelect(vendor)),
      }}
      useRouter={useRouter}
    />
  );
}
