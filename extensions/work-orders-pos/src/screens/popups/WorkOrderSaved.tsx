import { Button, ScrollView, Stack, Text } from '@shopify/retail-ui-extensions-react';
import { useState } from 'react';
import { useScreen } from '../../hooks/use-screen.js';
import { WorkOrder } from '@web/services/work-orders/types.js';
import { usePaymentHandler } from '../../hooks/use-payment-handler.js';

export function WorkOrderSaved() {
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const { Screen, closePopup } = useScreen('WorkOrderSaved', setWorkOrder);

  const paymentHandler = usePaymentHandler();

  const title = workOrder ? `Work order ${workOrder.name} saved` : 'Work order saved';
  const hasOrder = workOrder?.order?.type === 'order';

  return (
    <Screen
      title={title}
      isLoading={!workOrder || paymentHandler.isLoading}
      presentation={{ sheet: true }}
      overrideNavigateBack={() => closePopup(undefined)}
    >
      {workOrder && (
        <ScrollView>
          <Stack direction={'horizontal'} alignment={'center'} paddingVertical={'ExtraLarge'}>
            <Stack direction={'vertical'} alignment={'center'} paddingVertical={'ExtraLarge'}>
              <Text variant={'headingLarge'}>{title}</Text>
            </Stack>
          </Stack>
          <Stack direction={'vertical'} alignment={'center'} paddingVertical={'ExtraLarge'}>
            <Stack direction={'horizontal'} alignment={'center'} paddingVertical={'ExtraLarge'} flexChildren>
              <Button title={'Back to work order'} onPress={() => closePopup(undefined)} />

              {!hasOrder && (
                <Button title={'Pay Balance'} onPress={async () => await paymentHandler.handlePayment({ workOrder })} />
              )}
            </Stack>
          </Stack>
        </ScrollView>
      )}
    </Screen>
  );
}
