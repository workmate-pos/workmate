import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { useVendorsQuery, Vendor } from '@work-orders/common/queries/use-vendors-query.js';
import { useState } from 'react';
import { isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { UseRouter } from '../router.js';
import { ListPopup } from '../ListPopup.js';
import { getSubtitle } from '../../util/subtitle.js';

export type VendorSelectorProps = {
  onSelect: (vendor: string) => void;
  onClear?: () => void;
  useRouter: UseRouter;
};

export function VendorSelector({ onSelect, onClear, useRouter }: VendorSelectorProps) {
  const fetch = useAuthenticatedFetch();
  const vendorsQuery = useVendorsQuery({ fetch });
  const [query, setQuery] = useState('');

  const vendors = vendorsQuery.data ?? [];

  return (
    <ListPopup
      title={'Select vendor'}
      query={{ query, setQuery }}
      isLoadingMore={vendorsQuery.isFetching}
      resourceName={{ singular: 'vendor', plural: 'vendors' }}
      selection={{
        type: 'select',
        items: [
          onClear ? { id: '', leftSide: { label: 'Clear' } } : null,
          ...vendors
            .filter(vendor => !query || vendor.name.toLowerCase().includes(query.toLowerCase()))
            .map(vendor => getVendorItem(vendor)),
        ].filter(isNonNullable),
        onSelect: vendor => (vendor === '' ? onClear?.() : onSelect(vendor)),
      }}
      useRouter={useRouter}
    />
  );
}

export function getVendorItem(vendor: Vendor) {
  return {
    id: vendor.name,
    leftSide: {
      label: vendor.name,
      subtitle: getSubtitle(vendor.customer?.defaultAddress?.formatted),
    },
  };
}
