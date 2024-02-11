import { Status } from '@web/schemas/generated/create-purchase-order.js';
import { useScreen } from '@work-orders/common-pos/hooks/use-screen.js';
import { Button, Stack } from '@shopify/retail-ui-extensions-react';
import { titleCase } from '@teifi-digital/shopify-app-toolbox/string';

export function StatusSelector() {
  const statuses: Status[] = ['OPEN', 'CLOSED', 'CANCELLED'];

  const { Screen, closePopup } = useScreen('StatusSelector');

  return (
    <Screen title={'Select Status'} presentation={{ sheet: true }}>
      <Stack alignment="center" direction="vertical" flex={1} paddingHorizontal="ExtraExtraLarge">
        {statuses.map(status => (
          <Button title={titleCase(status)} onPress={() => closePopup(status)} />
        ))}
      </Stack>
    </Screen>
  );
}
