import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { useEffect, useState } from 'react';
import { useLocationQuery } from '@work-orders/common/queries/use-location-query.js';
import { useCustomerQuery } from '@work-orders/common/queries/use-customer-query.js';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { Button, ScrollView, Text } from '@shopify/ui-extensions-react/point-of-sale';
import { ResponsiveGrid } from '@teifi-digital/pos-tools/components/ResponsiveGrid.js';
import { ResponsiveStack } from '@teifi-digital/pos-tools/components/ResponsiveStack.js';
import { useRouter } from '../../routes.js';
import { useProductVariantQuery } from '@work-orders/common/queries/use-product-variant-query.js';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';

export function SerialsFilters({
  locationId: initialLocationId,
  customerId: initialCustomerId,
  productVariantId: initialProductVariantId,
  onLocationId,
  onCustomerId,
  onProductVariantId,
}: {
  locationId: ID | undefined;
  customerId: ID | undefined;
  productVariantId: ID | undefined;
  onLocationId: (locationId: ID | undefined) => void;
  onCustomerId: (customerId: ID | undefined) => void;
  onProductVariantId: (productVariantId: ID | undefined) => void;
}) {
  const [locationId, setLocationId] = useState(initialLocationId);
  const [customerId, setCustomerId] = useState(initialCustomerId);
  const [productVariantId, setProductVariantId] = useState(initialProductVariantId);

  useEffect(() => {
    onLocationId(locationId);
    onCustomerId(customerId);
    onProductVariantId(productVariantId);
  }, [locationId, customerId, productVariantId]);

  const fetch = useAuthenticatedFetch();
  const locationQuery = useLocationQuery({ fetch, id: locationId ?? null });
  const customerQuery = useCustomerQuery({ fetch, id: customerId ?? null });
  const productVariantQuery = useProductVariantQuery({ fetch, id: productVariantId ?? null });

  const location = locationQuery.data;
  const customer = customerQuery.data;
  const productVariant = productVariantQuery.data;

  const router = useRouter();
  const activeFilterCount = [locationId, customerId, productVariantId].filter(Boolean).length;

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
            title={'Customer' + (customerId ? `: ${customer?.displayName ?? 'loading...'}` : '')}
            onPress={() =>
              router.push('CustomerSelector', {
                onSelect: customer => setCustomerId(customer.id),
                onClear: () => setCustomerId(undefined),
              })
            }
          />
          <Button
            title={'Product' + (productVariantId ? `: ${getProductVariantName(productVariant) ?? 'loading...'}` : '')}
            onPress={() =>
              router.push('ProductVariantSelector', {
                onSelect: productVariant => setProductVariantId(productVariant.id),
                header: <Button title="Clear" onPress={() => setProductVariantId(undefined)} type="plain" />,
              })
            }
          />
        </ResponsiveGrid>

        <Button
          title={'Clear'}
          onPress={() => {
            setLocationId(undefined);
            setCustomerId(undefined);
          }}
          type={'destructive'}
          isDisabled={activeFilterCount === 0}
        />
      </ResponsiveGrid>
    </ScrollView>
  );
}
