import { Button, ScrollView, Stack, Stepper, Text } from '@shopify/retail-ui-extensions-react';
import { useState } from 'react';
import { useScreen } from '../../hooks/use-screen.js';
import { useCurrencyFormatter } from '../../hooks/use-currency-formatter.js';
import { CreateWorkOrderLineItem } from '../routes.js';
import { useProductVariantQuery } from '@work-orders/common/queries/use-product-variant-query.js';
import { useAuthenticatedFetch } from '../../hooks/use-authenticated-fetch.js';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { Int } from '@web/schemas/generated/create-work-order.js';

export function ProductLineItemConfig() {
  const [readonly, setReadonly] = useState(false);
  const [lineItem, setLineItem] = useState<CreateWorkOrderLineItem | null>(null);

  const { Screen, closePopup, cancelPopup } = useScreen('ProductLineItemConfig', ({ readonly, lineItem }) => {
    setReadonly(readonly);
    setLineItem(lineItem);
  });

  const currencyFormatter = useCurrencyFormatter();
  const fetch = useAuthenticatedFetch();
  const productVariantQuery = useProductVariantQuery({ fetch, id: lineItem?.productVariantId ?? null });
  const productVariant = productVariantQuery?.data;
  const name = getProductVariantName(productVariant);

  return (
    <Screen title={name ?? 'Product'} isLoading={productVariantQuery.isLoading} presentation={{ sheet: true }}>
      <ScrollView>
        {lineItem && productVariant && (
          <Stack direction="vertical" spacing={5}>
            <Stack direction="vertical">
              <Text variant="headingLarge">{name}</Text>
              <Text variant="body" color="TextSubdued">
                {productVariant.sku}
              </Text>
              <Text variant="body" color="TextSubdued">
                {currencyFormatter(productVariant.price)}
              </Text>
            </Stack>
            <Stack direction="vertical" spacing={2}>
              <Text variant="body" color="TextSubdued">
                Quantity
              </Text>
              <Stepper
                disabled={readonly}
                minimumValue={1}
                initialValue={lineItem.quantity}
                onValueChanged={(value: Int) => setLineItem({ ...lineItem, quantity: value })}
                value={lineItem.quantity}
              />
            </Stack>
            <Stack direction="vertical" flex={1} alignment="flex-end">
              {readonly && (
                <Button
                  title="Back"
                  onPress={() => {
                    cancelPopup();
                  }}
                />
              )}
              {!readonly && (
                <>
                  <Button
                    title="Remove"
                    type="destructive"
                    onPress={() => {
                      closePopup({ type: 'remove', lineItem });
                    }}
                  />
                  <Button
                    title="Save"
                    onPress={() => {
                      closePopup({ type: 'update', lineItem });
                    }}
                  />
                </>
              )}
            </Stack>
          </Stack>
        )}
      </ScrollView>
    </Screen>
  );
}
