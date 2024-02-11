import { useScreen } from '@work-orders/common-pos/hooks/use-screen.js';
import { Product } from '@web/schemas/generated/create-purchase-order.js';
import { useMemo, useState } from 'react';
import { useProductVariantQuery } from '@work-orders/common/queries/use-product-variant-query.js';
import { useAuthenticatedFetch } from '@work-orders/common-pos/hooks/use-authenticated-fetch.js';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { useUnsavedChangesDialog } from '@work-orders/common-pos/hooks/use-unsaved-changes-dialog.js';
import { Button, ScrollView, Stack, Stepper, Text } from '@shopify/retail-ui-extensions-react';
import { Int } from '@web/schemas/generated/create-work-order.js';
import { useInventoryItemQuery } from '@work-orders/common/queries/use-inventory-item-query.js';
import { useLocationQueries } from '@work-orders/common/queries/use-location-query.js';
import { ResponsiveGrid } from '@work-orders/common-pos/components/ResponsiveGrid.js';

export function ProductConfig() {
  const [product, setProduct] = useState<Product | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const unsavedChangesDialog = useUnsavedChangesDialog({ hasUnsavedChanges });
  const { Screen, closePopup } = useScreen('ProductConfig', product => {
    setProduct(product);
    setHasUnsavedChanges(false);
  });

  const fetch = useAuthenticatedFetch();

  const productVariantQuery = useProductVariantQuery({ fetch, id: product?.productVariantId ?? null });
  const productVariant = productVariantQuery?.data;

  const inventoryItemQuery = useInventoryItemQuery({ fetch, id: productVariant?.inventoryItem?.id ?? null });
  const inventoryLevels = inventoryItemQuery?.data?.inventoryLevels?.nodes;

  const locationIds = useMemo(() => inventoryLevels?.map(level => level.location.id) ?? [], [inventoryLevels]);
  const locationQueries = useLocationQueries({ fetch, ids: locationIds });

  const loadingLocations = Object.values(locationQueries).some(query => query.isLoading);

  // TODO: Show current stock in a nicer way - maybe for just one loc? (if so change inventory level endpoint/gql query)

  return (
    <Screen
      title={getProductVariantName(productVariant) ?? 'Product Config'}
      isLoading={!product || productVariantQuery.isLoading || inventoryItemQuery.isLoading}
      presentation={{ sheet: true }}
      overrideNavigateBack={() => unsavedChangesDialog.show()}
    >
      <ScrollView>
        {product && productVariant && inventoryLevels && (
          <Stack direction="vertical" spacing={5}>
            <Stack direction="vertical">
              <Text variant="headingLarge">{getProductVariantName(productVariant)}</Text>
              <Text variant="body" color="TextSubdued">
                {productVariant.sku}
              </Text>
            </Stack>

            <Stack direction="vertical" spacing={2}>
              <Stack direction={'horizontal'} alignment={'center'} paddingVertical={'Medium'}>
                <Text variant="headingSmall" color="TextSubdued">
                  Stock
                </Text>
              </Stack>

              {inventoryLevels?.flatMap(level => (
                <ResponsiveGrid columns={2} key={level.location.id}>
                  <Stack direction={'horizontal'} alignment={'center'} flex={1}>
                    <Text variant="body" color={'TextSubdued'}>
                      {locationQueries[level.location.id]?.data?.name ?? 'Unknown location'}
                    </Text>
                  </Stack>
                  <Stack direction={'horizontal'} alignment={'center'} flex={1}>
                    <Text variant="body" color={'TextSubdued'}>
                      {level.quantities.find(quantity => quantity.name === 'available')?.quantity ?? '?'}
                    </Text>
                  </Stack>
                </ResponsiveGrid>
              ))}

              <Stack direction={'horizontal'} alignment={'center'}>
                {loadingLocations && <Text variant="body">Loading locations...</Text>}
                {!loadingLocations && inventoryLevels.length === 0 && <Text variant="body">No stock available</Text>}
              </Stack>
            </Stack>

            <Stack direction="vertical" spacing={2}>
              <Stack direction={'horizontal'} alignment={'center'} paddingVertical={'Medium'}>
                <Text variant="headingSmall" color="TextSubdued">
                  Quantity
                </Text>
              </Stack>
              <Stepper
                minimumValue={1}
                initialValue={product.quantity}
                value={product.quantity}
                onValueChanged={(quantity: Int) => {
                  setProduct({ ...product, quantity });
                  setHasUnsavedChanges(true);
                }}
              />
            </Stack>
            <Stack direction="vertical" flex={1} alignment="flex-end">
              <Button
                title="Remove"
                type="destructive"
                onPress={() => closePopup({ ...product, quantity: 0 as Int })}
              />
              <Button title="Save" type="primary" onPress={() => closePopup(product)} />
            </Stack>
          </Stack>
        )}
      </ScrollView>
    </Screen>
  );
}
