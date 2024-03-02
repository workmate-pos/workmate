import { Button, ScrollView, Stack, Text } from '@shopify/retail-ui-extensions-react';
import { useState } from 'react';
import { WorkOrder } from '@web/services/work-orders/types.js';
import { PayButton } from '../../components/PayButton.js';
import { useScreen } from '@teifi-digital/pos-tools/router';
import { useRouter } from '../../routes.js';

export function WorkOrderSaved({ workOrder }: { workOrder: WorkOrder }) {
  const [paymentLoading, setPaymentLoading] = useState(false);

  const title = workOrder ? `Work order ${workOrder.name} saved` : 'Work order saved';
  const hasOrder = workOrder?.order?.type === 'order';

  const router = useRouter();
  const screen = useScreen();
  screen.setTitle(title);
  screen.setIsLoading(paymentLoading);

  return (
    <ScrollView>
      <Stack direction={'horizontal'} alignment={'center'} paddingVertical={'ExtraLarge'}>
        <Stack direction={'vertical'} alignment={'center'} paddingVertical={'ExtraLarge'}>
          <Text variant={'headingLarge'}>{title}</Text>
        </Stack>
      </Stack>
      <Stack direction={'vertical'} alignment={'center'} paddingVertical={'ExtraLarge'}>
        <Stack direction={'horizontal'} alignment={'center'} paddingVertical={'ExtraLarge'} flexChildren>
          <Button title={'Back to work order'} onPress={() => router.pop()} />

          {!hasOrder && (
            <PayButton workOrderName={workOrder.name} createWorkOrder={null} setLoading={setPaymentLoading} />
          )}
        </Stack>
      </Stack>
    </ScrollView>
  );
}
