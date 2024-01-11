import { Button, ScrollView, Stack, Text } from '@shopify/retail-ui-extensions-react';
import { useState } from 'react';
import { useScreen } from '../../hooks/use-screen.js';
import { WorkOrder } from '@web/services/work-orders/types.js';
import { PayButton } from '../../components/PayButton.js';

export function WorkOrderSaved() {
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const { Screen, closePopup } = useScreen('WorkOrderSaved', setWorkOrder);

  const [paymentLoading, setPaymentLoading] = useState(false);

  const title = workOrder ? `Work order ${workOrder.name} saved` : 'Work order saved';
  const hasOrder = workOrder?.order?.type === 'order';

  return (
    <Screen
      title={title}
      isLoading={!workOrder || paymentLoading}
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
                <PayButton workOrderName={workOrder.name} createWorkOrder={null} setLoading={setPaymentLoading} />
              )}
            </Stack>
          </Stack>
        </ScrollView>
      )}
    </Screen>
  );
}
