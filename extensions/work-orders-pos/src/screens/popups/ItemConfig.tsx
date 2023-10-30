import { Button, ScrollView, Stack, Stepper, Text } from '@shopify/retail-ui-extensions-react';
import { useState } from 'react';
import type { WorkOrderItem } from '../WorkOrder';
import { useScreen } from '../../hooks/use-screen';

export type ItemConfigParams = {
  item: WorkOrderItem;
};

export const ItemConfig = () => {
  const [item, setItem] = useState<WorkOrderItem | null>(null);
  const updateItem = <K extends keyof WorkOrderItem>(key: K, value: WorkOrderItem[K]) => {
    setItem(item => (item ? { ...item, [key]: value } : null));
  };

  const { Screen, closePopup } = useScreen('ItemConfig', setItem);

  return (
    <Screen title={item?.title ?? 'Item'} isLoading={!item} presentation={{ sheet: true }}>
      {item && (
        <ScrollView>
          <Stack direction="vertical" spacing={5}>
            <Stack direction="vertical">
              <Text variant="headingLarge">{item.title}</Text>
              <Text variant="body" color="TextSubdued">
                {item.sku}
              </Text>
              <Text variant="body" color="TextSubdued">
                ${item.price}
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
                  closePopup({ type: 'remove', item });
                }}
              />
              <Button
                title="Save"
                onPress={() => {
                  closePopup({ type: 'update', item });
                }}
              />
            </Stack>
          </Stack>
        </ScrollView>
      )}
    </Screen>
  );
};
