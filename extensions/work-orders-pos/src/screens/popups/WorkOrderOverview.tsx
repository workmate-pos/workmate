import { useState } from 'react';
import { useScreen } from '../../hooks/use-screen';
import { Button, ScrollView, Stack, Text } from '@shopify/retail-ui-extensions-react';
import { titleCase } from '../../util/casing';
import { useCurrencyFormatter } from '../../hooks/use-currency-formatter';
import { useWorkOrderQuery } from '../../queries/use-work-order-query';
import { usePaymentHandler } from '../../hooks/usePaymentHandler';

// TODO: Do error messages, etc, here instead of in the WorkOrder screen
export function WorkOrderOverview() {
  // TODO: make this the main screen for existing work orders
  // TODO: payment and deposit here

  const [workOrderName, setWorkOrderName] = useState<string | null>(null);
  const { Screen } = useScreen('WorkOrderOverview', ({ name }) => setWorkOrderName(name));

  const workOrderQuery = useWorkOrderQuery(workOrderName);
  const workOrder = workOrderQuery.data;

  const dueDate = workOrder?.dueDate ? new Date(workOrder.dueDate) : new Date();
  const localDueDate = new Date(dueDate.getTime() + dueDate.getTimezoneOffset() * 60 * 1000);
  const currencyFormatter = useCurrencyFormatter();

  const taxAmount = workOrder?.price?.tax ?? 0;
  const shippingAmount = workOrder?.price?.shipping ?? 0;
  const productsAmount = workOrder?.products?.reduce((a, p) => a + p.unitPrice * p.quantity, 0) ?? 0;
  const discountAmount = workOrder?.price?.discount ?? 0;
  const totalAmount = taxAmount + shippingAmount + productsAmount - discountAmount;
  const paymentAmount = workOrder?.payments?.reduce((a, p) => a + p.amount, 0) ?? 0;
  const employeeNames = workOrder?.employeeAssignments?.map(e => e.name) ?? [];

  const info: [title: string, values: string[]][] = [
    ['Name', [workOrder?.name ?? 'New Work Order']],
    ['Description', [workOrder?.description ?? '']],
    ['Customer', [workOrder?.customer?.name ?? '']],
    ['Status', [workOrder?.status ?? '']],
    ['Due Date', [localDueDate.toDateString()]],
    ['Employees', employeeNames.length ? employeeNames : ['None']],
    ['Shipping', [currencyFormatter(workOrder?.price?.shipping ?? 0)]],
    ['Tax', [currencyFormatter(taxAmount ?? 0)]],
    ['Discount', [currencyFormatter(discountAmount ?? 0)]],
    ['Products', [currencyFormatter(productsAmount)]],
    ['Total', [currencyFormatter(totalAmount ?? 0)]],
    ['Payments', workOrder?.payments?.map(p => `${titleCase(p.type)}: ${currencyFormatter(p.amount)}`) ?? []],
    ['Due', [currencyFormatter(totalAmount - paymentAmount)]],
  ];

  const paymentHandler = usePaymentHandler();

  return (
    <Screen title="Overview" presentation={{ sheet: true }} isLoading={workOrderQuery.isLoading}>
      <ScrollView>
        <Stack direction={'vertical'} spacing={4} flex={1}>
          <Text variant="headingLarge">{workOrder?.name || 'New Work Order'}</Text>
          <Stack direction={'horizontal'} flexWrap={'wrap'} spacing={4} flex={1}>
            {info.map(([title, values]) => (
              <Stack
                direction={'vertical'}
                key={title}
                alignment={'flex-start'}
                spacing={0.5}
                paddingVertical={'Small'}
              >
                <Text variant={'body'}>{title}</Text>
                {values.map((value, i) => (
                  <Text variant={'captionRegular'} key={i}>
                    {value}
                  </Text>
                ))}
              </Stack>
            ))}
          </Stack>
        </Stack>
        <Stack direction={'horizontal'} flexChildren paddingVertical={'ExtraLarge'}>
          <Button title={'Edit'} />

          <Button title={'Make Deposit'} />
          <Button title={'Make Payment'} />
        </Stack>
      </ScrollView>
    </Screen>
  );
}
