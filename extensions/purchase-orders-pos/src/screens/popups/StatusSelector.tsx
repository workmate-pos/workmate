import { Status } from '@web/schemas/generated/create-purchase-order.js';
import { useScreen } from '@work-orders/common-pos/hooks/use-screen.js';
import { Button, Stack } from '@shopify/retail-ui-extensions-react';

export function StatusSelector() {
  const statuses: Status[] = ['OPEN', 'IN_PROGRESS', 'CLOSED', 'CANCELLED'];

  const { Screen, closePopup } = useScreen('StatusSelector');

  return (
    <Screen title={'Select Status'} presentation={{ sheet: true }}>
      <Stack alignment="center" direction="vertical" flex={1} paddingHorizontal="ExtraExtraLarge">
        {statuses.map(status => (
          <Button title={status} onPress={() => closePopup(status)} />
        ))}
      </Stack>
    </Screen>
  );
}