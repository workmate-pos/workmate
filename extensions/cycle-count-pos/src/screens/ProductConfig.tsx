import { useScreen } from '@teifi-digital/pos-tools/router';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { useProductVariantQuery } from '@work-orders/common/queries/use-product-variant-query.js';
import { Button, ScrollView, Stack, Stepper, Text } from '@shopify/retail-ui-extensions-react';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { useState } from 'react';
import { useRouter } from '../routes.js';

export function ProductConfig({
  productVariantId,
  quantity: initialQuantity,
  onSave,
  onRemove,
}: {
  productVariantId: ID;
  quantity: number;
  onSave: (quantity: number) => void;
  onRemove: () => void;
}) {
  const [quantity, setQuantity] = useState(initialQuantity);

  const screen = useScreen();
  const router = useRouter();

  const fetch = useAuthenticatedFetch();
  const productVariantQuery = useProductVariantQuery({ fetch, id: productVariantId });

  if (productVariantQuery.isLoading) {
    screen.setIsLoading(true);
    return null;
  }

  if (productVariantQuery.isError) {
    return (
      <ScrollView>
        <Stack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
          <Text color="TextCritical" variant="body">
            {extractErrorMessage(productVariantQuery.error, 'Error loading product variant')}
          </Text>
        </Stack>
      </ScrollView>
    );
  }

  const productVariant = productVariantQuery.data;

  if (!productVariant) {
    return (
      <ScrollView>
        <Stack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
          <Text color="TextCritical" variant="body">
            Product variant not found
          </Text>
        </Stack>
      </ScrollView>
    );
  }

  const name = getProductVariantName(productVariant) ?? 'Unknown Product';

  screen.setIsLoading(false);
  screen.setTitle(name);

  return (
    <ScrollView>
      <Stack direction="vertical" spacing={5} flexChildren flex={1}>
        <Stack direction="vertical">
          <Text variant="headingLarge">{name}</Text>
          <Text variant="body" color="TextSubdued">
            {productVariant?.sku}
          </Text>
        </Stack>

        <Stack direction="vertical" spacing={2}>
          <Stack direction={'horizontal'} alignment={'center'}>
            <Text variant="headingSmall" color="TextSubdued">
              Quantity
            </Text>
          </Stack>
          <Stepper minimumValue={0} initialValue={quantity} value={quantity} onValueChanged={setQuantity} />
        </Stack>

        <Stack direction="vertical" flex={1} alignment="flex-end">
          <Button
            title="Remove"
            type="destructive"
            onPress={() => {
              onRemove();
              router.popCurrent();
            }}
          />
          <Button
            title="Save"
            type="primary"
            onPress={() => {
              onSave(quantity);
              router.popCurrent();
            }}
          />
        </Stack>
      </Stack>
    </ScrollView>
  );
}
