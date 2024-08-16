import { ResponsiveGrid } from '@teifi-digital/pos-tools/components/ResponsiveGrid.js';
import { useState } from 'react';
import { Stack, Stepper, Text } from '@shopify/retail-ui-extensions-react';
import { pick } from '@teifi-digital/shopify-app-toolbox/object';

export type QuantityAdjustmentListItem<ID extends string = string> = {
  id: ID;
  name: string;
  min?: number;
  max?: number;
  quantity: number;
};

/**
 * Page where you can adjust integer quantities of many items through steppers.
 */
export function QuantityAdjustmentList<ID extends string>({
  items: initialItems,
  onChange,
}: {
  items: QuantityAdjustmentListItem<ID>[];
  onChange: (itemsList: Pick<QuantityAdjustmentListItem<ID>, 'id' | 'quantity'>[]) => void;
}) {
  const [items, setItems] = useState(initialItems);

  return (
    <ResponsiveGrid columns={1} flex={0}>
      <ResponsiveGrid columns={2} spacing={2}>
        {items.flatMap(item => [
          <Text variant={'headingSmall'}>{item.name}</Text>,
          <Stepper
            initialValue={item.quantity}
            value={item.quantity}
            minimumValue={item.min}
            maximumValue={item.max}
            onValueChanged={(quantity: number) => {
              const newItems = items.map(x => (x.id === item.id ? { ...x, quantity } : x));
              setItems(newItems);
              onChange(newItems.map(item => pick(item, 'id', 'quantity')));
            }}
          />,
        ])}
      </ResponsiveGrid>

      {items.length === 0 && (
        <Stack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
          <Text color="TextSubdued" variant="body">
            No items found
          </Text>
        </Stack>
      )}
    </ResponsiveGrid>
  );
}
