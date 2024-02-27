import { type CreatePurchaseOrder, Product } from '@web/schemas/generated/create-purchase-order.js';
import { useState } from 'react';
import { useProductVariantQuery } from '@work-orders/common/queries/use-product-variant-query.js';
import { useAuthenticatedFetch } from '@work-orders/common-pos/hooks/use-authenticated-fetch.js';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { useUnsavedChangesDialog } from '@work-orders/common-pos/hooks/use-unsaved-changes-dialog.js';
import { Button, ScrollView, Stack, Stepper, Text } from '@shopify/retail-ui-extensions-react';
import { Int } from '@web/schemas/generated/create-work-order.js';
import { useInventoryItemQuery } from '@work-orders/common/queries/use-inventory-item-query.js';
import { ResponsiveGrid } from '@work-orders/common-pos/components/ResponsiveGrid.js';
import { titleCase } from '@teifi-digital/shopify-app-toolbox/string';
import { extractErrorMessage } from '@work-orders/common-pos/util/errors.js';
import { useScreen } from '@work-orders/common-pos/router/controllable-screen.js';
import { NonNullableValues } from '../../types.js';

export function ProductConfig({
  product: initialProduct,
  locationName,
  locationId,
  onSave,
}: NonNullableValues<Pick<CreatePurchaseOrder, 'locationName' | 'locationId'>> & {
  product: Product;
  onSave: (product: Product) => void;
}) {
  const [product, setProduct] = useState<Product>(initialProduct);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const fetch = useAuthenticatedFetch();

  const productVariantQuery = useProductVariantQuery({ fetch, id: product?.productVariantId ?? null });
  const productVariant = productVariantQuery?.data;

  const inventoryItemQuery = useInventoryItemQuery({ fetch, id: productVariant?.inventoryItem?.id ?? null });
  const inventoryLevel = inventoryItemQuery?.data?.inventoryLevels?.nodes?.find(
    level => level.location.id === locationId,
  );

  const screen = useScreen();
  const unsavedChangesDialog = useUnsavedChangesDialog({ hasUnsavedChanges });

  screen.addOverrideNavigateBack(unsavedChangesDialog.show);
  screen.setTitle(getProductVariantName(productVariant) ?? 'Product Config');
  screen.setIsLoading(!product || productVariantQuery.isLoading || inventoryItemQuery.isLoading);

  // TODO: Show current stock in a nicer way - maybe for just one loc? (if so change inventory level endpoint/gql query)

  return (
    <ScrollView>
      {product && (
        <Stack direction="vertical" spacing={5} flexChildren flex={1}>
          <Stack direction="vertical">
            <Text variant="headingLarge">{getProductVariantName(productVariant) ?? 'Unknown Product'}</Text>
            <Text variant="body" color="TextSubdued">
              {productVariant?.sku}
            </Text>
          </Stack>

          <Stack direction={'vertical'} paddingVertical={'Medium'}>
            <Stack direction={'horizontal'} alignment={'center'}>
              <Text variant="headingSmall" color="TextSubdued">
                Stock at {locationName}
              </Text>
            </Stack>

            {inventoryItemQuery.isLoading && (
              <Stack direction={'horizontal'} alignment={'center'}>
                <Text variant="body" color="TextSubdued">
                  Loading...
                </Text>
              </Stack>
            )}

            {inventoryItemQuery.isError && (
              <Stack direction={'horizontal'} alignment={'center'}>
                <Text variant="body" color="TextCritical">
                  {extractErrorMessage(inventoryItemQuery.error, 'An error occurred while loading stock')}
                </Text>
              </Stack>
            )}

            {inventoryItemQuery.data && !inventoryLevel && (
              <Stack direction={'horizontal'} alignment={'center'}>
                <Text variant="body" color="TextSubdued">
                  No stock at this location
                </Text>
              </Stack>
            )}

            {inventoryLevel?.quantities?.length === 0 && (
              <Stack direction={'horizontal'} alignment={'center'}>
                <Text variant="body" color="TextSubdued">
                  No stock types found
                </Text>
              </Stack>
            )}

            <Stack direction={'horizontal'} flex={1} flexChildren paddingVertical={'Medium'}>
              <ResponsiveGrid columns={2}>
                {inventoryLevel?.quantities?.flatMap(({ name, quantity }) => [
                  <Stack direction={'horizontal'} alignment={'center'}>
                    <Text variant="body" color="TextSubdued">
                      {titleCase(name)}
                    </Text>
                  </Stack>,
                  <Stack direction={'horizontal'} alignment={'center'}>
                    <Text variant="body" color="TextSubdued">
                      {quantity}
                    </Text>
                  </Stack>,
                ])}
              </ResponsiveGrid>
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
            <Button title="Remove" type="destructive" onPress={() => onSave({ ...product, quantity: 0 as Int })} />
            <Button title="Save" type="primary" onPress={() => onSave(product)} />
          </Stack>
        </Stack>
      )}
    </ScrollView>
  );
}
