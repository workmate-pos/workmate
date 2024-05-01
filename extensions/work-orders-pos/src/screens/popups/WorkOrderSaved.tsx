import { Button, ScrollView, Stack, Text } from '@shopify/retail-ui-extensions-react';
import { WorkOrder } from '@web/services/work-orders/types.js';
import { useScreen } from '@teifi-digital/pos-tools/router';
import { useRouter } from '../../routes.js';

export function WorkOrderSaved({ workOrder }: { workOrder: WorkOrder }) {
  const title = `Work order ${workOrder.name} saved`;

  const router = useRouter();
  const screen = useScreen();
  screen.setTitle(title);

  return (
    <ScrollView>
      <Stack direction={'horizontal'} alignment={'center'} paddingVertical={'ExtraLarge'}>
        <Stack direction={'vertical'} alignment={'center'} paddingVertical={'ExtraLarge'}>
          <Text variant={'headingLarge'}>{title}</Text>
        </Stack>
      </Stack>
      <Stack direction={'vertical'} alignment={'center'} paddingVertical={'ExtraLarge'}>
        <Stack direction={'horizontal'} alignment={'center'} paddingVertical={'ExtraLarge'} flexChildren>
          <Button title={'Back to work order'} onPress={() => router.popCurrent()} />

          <Button
            title={'Manage payments'}
            onPress={async () => {
              await router.popCurrent();
              router.push('PaymentOverview', { name: workOrder.name });
            }}
          />
        </Stack>
      </Stack>
    </ScrollView>
  );
}
