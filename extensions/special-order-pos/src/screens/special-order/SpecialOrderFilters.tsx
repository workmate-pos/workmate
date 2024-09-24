import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { OrderState, PurchaseOrderState } from '@web/schemas/generated/special-order-pagination-options.js';
import { Button, ScrollView, Text } from '@shopify/ui-extensions-react/point-of-sale';
import { titleCase } from '@teifi-digital/shopify-app-toolbox/string';
import { ResponsiveGrid } from '@teifi-digital/pos-tools/components/ResponsiveGrid.js';
import { ResponsiveStack } from '@teifi-digital/pos-tools/components/ResponsiveStack.js';
import { useRouter } from '../../routes.js';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { useLocationQuery } from '@work-orders/common/queries/use-location-query.js';
import { useCustomerQuery } from '@work-orders/common/queries/use-customer-query.js';
import { useEffect, useState } from 'react';

export function SpecialOrderFilters({
  vendorName: initialVendorName,
  orderState: initialOrderState,
  purchaseOrderState: initialPurchaseOrderState,
  customerId: initialCustomerId,
  locationId: initialLocationId,
  onPurchaseOrderState,
  onVendorName,
  onOrderState,
  onCustomerId,
  onLocationId,
}: {
  locationId: ID | undefined;
  customerId: ID | undefined;
  orderState: OrderState | undefined;
  purchaseOrderState: PurchaseOrderState | undefined;
  vendorName: string | undefined;
  onLocationId: (locationId: ID | undefined) => void;
  onCustomerId: (customerId: ID | undefined) => void;
  onOrderState: (orderState: OrderState | undefined) => void;
  onPurchaseOrderState: (purchaseOrderState: PurchaseOrderState | undefined) => void;
  onVendorName: (vendorName: string | undefined) => void;
}) {
  const [locationId, setLocationId] = useState<ID | undefined>(initialLocationId);
  const [customerId, setCustomerId] = useState<ID | undefined>(initialCustomerId);
  const [orderState, setOrderState] = useState<OrderState | undefined>(initialOrderState);
  const [purchaseOrderState, setPurchaseOrderState] = useState<PurchaseOrderState | undefined>(
    initialPurchaseOrderState,
  );
  const [vendorName, setVendorName] = useState<string | undefined>(initialVendorName);

  useEffect(() => {
    onLocationId(locationId);
    onCustomerId(customerId);
    onOrderState(orderState);
    onPurchaseOrderState(purchaseOrderState);
    onVendorName(vendorName);
  }, [locationId, customerId, orderState, purchaseOrderState, vendorName]);

  const router = useRouter();

  const fetch = useAuthenticatedFetch();

  const locationQuery = useLocationQuery({ fetch, id: locationId ?? null });
  const location = locationQuery.data;

  const customerQuery = useCustomerQuery({ fetch, id: customerId ?? null });
  const customer = customerQuery.data;

  const activeFilterCount = [locationId, customerId, vendorName, orderState, purchaseOrderState].filter(Boolean).length;

  return (
    <ScrollView>
      <ResponsiveGrid columns={1} spacing={2}>
        <ResponsiveStack direction={'horizontal'} alignment={'center'}>
          <Text variant="headingLarge">Filters</Text>
        </ResponsiveStack>

        <ResponsiveGrid columns={2} smColumns={1}>
          <Button
            title={'Location' + (locationId ? `: ${location?.name ?? 'loading...'}` : '')}
            onPress={() =>
              router.push('LocationSelector', {
                onSelect: location => setLocationId(location.id),
                onClear: () => setLocationId(undefined),
              })
            }
          />
          <Button
            title={'Vendor' + (vendorName ? `: ${vendorName}` : '')}
            onPress={() =>
              router.push('VendorSelector', {
                onSelect: setVendorName,
                onClear: () => setVendorName(undefined),
              })
            }
          />
          <Button
            title={'Customer' + (customerId ? `: ${customer?.displayName ?? 'loading...'}` : '')}
            onPress={() =>
              router.push('CustomerSelector', {
                onSelect: customer => setCustomerId(customer.id),
                onClear: () => setCustomerId(undefined),
              })
            }
          />
          <Button
            title={'Order state' + (orderState ? `: ${titleCase(orderState).toLowerCase()}` : '')}
            onPress={() =>
              router.push('OrderStateSelector', {
                onSelect: setOrderState,
                onClear: () => setOrderState(undefined),
              })
            }
          />
          <Button
            title={
              'Purchase order state' + (purchaseOrderState ? `: ${titleCase(purchaseOrderState).toLowerCase()}` : '')
            }
            onPress={() =>
              router.push('PurchaseOrderStateSelector', {
                onSelect: setPurchaseOrderState,
                onClear: () => setPurchaseOrderState(undefined),
              })
            }
          />
        </ResponsiveGrid>

        <Button
          title={'Clear'}
          onPress={() => {
            setLocationId(undefined);
            setCustomerId(undefined);
            setVendorName(undefined);
            setOrderState(undefined);
            setPurchaseOrderState(undefined);
          }}
          type={'destructive'}
          isDisabled={activeFilterCount === 0}
        />
      </ResponsiveGrid>
    </ScrollView>
  );
}
