import { Button, ScrollView, Stack, Text } from '@shopify/retail-ui-extensions-react';
import { WorkOrder } from '@web/services/work-orders/types.js';
import { usePaymentHandler } from '../../hooks/use-payment-handler.js';
import { useScreen } from '@teifi-digital/pos-tools/router';
import { useRouter } from '../../routes.js';

export function WorkOrderSaved({ workOrder }: { workOrder: WorkOrder }) {
  const paymentHandler = usePaymentHandler();

  const title = workOrder ? `Work order ${workOrder.name} saved` : 'Work order saved';
  const hasOrder = workOrder?.order?.type === 'order';

  const router = useRouter();
  const screen = useScreen();
  screen.setTitle(title);
  screen.setIsLoading(paymentHandler.isLoading);

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

          {!hasOrder && (
            <Button title={'Pay Balance'} onPress={async () => await paymentHandler.handlePayment({ workOrder })} />
          )}
        </Stack>
      </Stack>
    </ScrollView>
  );
}
