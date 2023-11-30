import { useScreen } from '../../hooks/use-screen';
import { useState } from 'react';
import type { WorkOrder } from '../WorkOrder';
import { Button, ScrollView, Stack, Text } from '@shopify/retail-ui-extensions-react';
import { getPriceDetails } from '../../util/work-order';
import { usePaymentHandler } from '../../hooks/use-payment-handler';
import { useCurrencyFormatter } from '../../hooks/use-currency-formatter';

export function WorkOrderSaved() {
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const { Screen, usePopup, closePopup } = useScreen('WorkOrderSaved', setWorkOrder);

  const currencyFormatter = useCurrencyFormatter();
  const paymentHandler = usePaymentHandler();
  const depositPopup = usePopup('DiscountOrDepositSelector', result => {
    if (result.select === 'deposit') {
      paymentHandler.handlePayment({
        workOrderName: workOrder!.name!,
        type: 'deposit',
        amount: result.currencyAmount,
      });
    }
  });

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
                  {priceDetails.deposited === 0 && (
                    <Button
                      title={'Make Deposit'}
                      onPress={() =>
                        depositPopup.navigate({
                          select: 'deposit',
                          subTotal: priceDetails.subTotal,
                        })
                      }
                    />
                  )}
                  <Button
                    title={`Pay due balance (${currencyFormatter(priceDetails.balanceDue)})`}
                    onPress={() =>
                      paymentHandler.handlePayment({
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
