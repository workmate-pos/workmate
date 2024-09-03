import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { useVendorsQuery, Vendor } from '@work-orders/common/queries/use-vendors-query.js';
import { useState } from 'react';
import { isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { UseRouter } from '../router.js';
import { ListPopup } from '../ListPopup.js';
import { getSubtitle } from '../../util/subtitle.js';
import { useNotFullyOrderedSpecialOrderVendorsQuery } from '@work-orders/common/queries/use-not-fully-ordered-special-order-vendors-query.js';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { getVendorItem } from './VendorSelector.js';

export type NotFullyOrderedSpecialOrderVendorSelectorProps = {
  locationId: ID;
  onSelect: (vendor: string) => void;
  onClear?: () => void;
  useRouter: UseRouter;
};

export function NotFullyOrderedSpecialOrderVendorSelector({
  locationId,
  onSelect,
  onClear,
  useRouter,
}: NotFullyOrderedSpecialOrderVendorSelectorProps) {
  const fetch = useAuthenticatedFetch();
  const vendorsQuery = useNotFullyOrderedSpecialOrderVendorsQuery({ fetch, locationId });
  const [query, setQuery] = useState('');

  const vendors = vendorsQuery.data ?? [];

  return (
    <ListPopup
      title={'Select Vendor'}
      query={{ query, setQuery }}
      resourceName={{ singular: 'vendor', plural: 'vendors' }}
      isLoadingMore={vendorsQuery.isFetching}
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
