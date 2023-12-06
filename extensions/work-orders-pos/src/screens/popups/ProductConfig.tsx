import { Button, ScrollView, Stack, Stepper, Text } from '@shopify/retail-ui-extensions-react';
import { useState } from 'react';
import { useScreen } from '../../hooks/use-screen.js';
import { useCurrencyFormatter } from '../../hooks/use-currency-formatter.js';
import { WorkOrderProduct } from '../../types/work-order';

export function ProductConfig() {
  const [item, setItem] = useState<WorkOrderProduct | null>(null);
  const updateItem = <K extends keyof WorkOrderProduct>(key: K, value: WorkOrderProduct[K]) => {
    setItem(item => (item ? { ...item, [key]: value } : null));
  };

  const { Screen, closePopup } = useScreen('ProductConfig', setItem);
  const currencyFormatter = useCurrencyFormatter();

  return (
    <Screen title={item?.name ?? 'Product'} isLoading={!item} presentation={{ sheet: true }}>
      {item && (
        <ScrollView>
          <Stack direction="vertical" spacing={5}>
            <Stack direction="vertical">
              <Text variant="headingLarge">{item.name}</Text>
              <Text variant="body" color="TextSubdued">
                {item.sku}
              </Text>
              <Text variant="body" color="TextSubdued">
                {currencyFormatter(item.unitPrice)}
              </Text>
            </Stack>
            <Stack direction="vertical" spacing={2}>
              <Text variant="body" color="TextSubdued">
                Quantity
              </Text>
              <Stepper
                minimumValue={1}
                initialValue={item.quantity}
                onValueChanged={value => updateItem('quantity', value)}
                value={item.quantity}
              />
            </Stack>
            <Stack direction="vertical" flex={1} alignment="flex-end">
              <Button
                title="Remove"
                type="destructive"
                onPress={() => {
                  closePopup({ type: 'remove', product: item });
                }}
              />
              <Button
                title="Save"
                onPress={() => {
                  closePopup({ type: 'update', product: item });
                }}
              />
            </Stack>
          </Stack>
        </ScrollView>
      )}
    </Screen>
  );
}
