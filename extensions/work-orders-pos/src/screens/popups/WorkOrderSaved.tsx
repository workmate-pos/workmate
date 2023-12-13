import { Button, ScrollView, Stack, Text } from '@shopify/retail-ui-extensions-react';
import { useState } from 'react';
import { useScreen } from '../../hooks/use-screen.js';
import { getPriceDetails } from '../../util/work-order.js';
import { usePaymentHandler } from '../../hooks/use-payment-handler.js';
import { useCurrencyFormatter } from '../../hooks/use-currency-formatter.js';
import { WorkOrder } from '../../types/work-order';

export function WorkOrderSaved() {
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const { Screen, closePopup } = useScreen('WorkOrderSaved', setWorkOrder);

  const currencyFormatter = useCurrencyFormatter();
  const paymentHandler = usePaymentHandler();

  const title = workOrder ? `Work order ${workOrder.name} saved` : 'Work order saved';
  const priceDetails = workOrder ? getPriceDetails(workOrder) : null;

  return (
    <Screen title={title} isLoading={!workOrder || paymentHandler.isLoading} presentation={{ sheet: true }}>
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

              {priceDetails && priceDetails.balanceDue > 0 && (
                <>
                  <Button
                    title={`Pay due balance (${currencyFormatter(priceDetails.balanceDue)})`}
                    onPress={() =>
                      paymentHandler.handlePayment({
                        customerId: workOrder!.customer!.id,
                        workOrderName: workOrder.name!,
                        type: 'balance',
                        amount: priceDetails.balanceDue,
                        previouslyDeposited: priceDetails.deposited,
                      })
                    }
                  />
                </>
              )}
            </Stack>
          </Stack>
        </ScrollView>
      )}
    </Screen>
  );
}
