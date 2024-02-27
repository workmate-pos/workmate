import { Status } from '@web/schemas/generated/create-purchase-order.js';
import { Button, ScrollView, Stack } from '@shopify/retail-ui-extensions-react';
import { titleCase } from '@teifi-digital/shopify-app-toolbox/string';

export function StatusSelector({ onSelect }: { onSelect: (status: Status) => void }) {
  const statuses: Status[] = ['OPEN', 'CLOSED', 'RECEIVED', 'CANCELLED'];

  return (
    <ScrollView>
      <Stack alignment="center" direction="vertical" flex={1} paddingHorizontal="ExtraExtraLarge">
        {statuses.map(status => (
          <Button title={titleCase(status)} onPress={() => onSelect(status)} />
        ))}
      </Stack>
    </ScrollView>
  );
}
