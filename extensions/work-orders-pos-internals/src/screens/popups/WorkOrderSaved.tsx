import { Button, ScrollView, Stack, Text } from '@shopify/ui-extensions-react/point-of-sale';
import { DetailedWorkOrder } from '@web/services/work-orders/types.js';
import { useScreen } from '@teifi-digital/pos-tools/router';
import { useRouter } from '../../routes.js';
import { getUnsourcedWorkOrderItems } from './WorkOrderItemSourcing.js';
import { ResponsiveGrid } from '@teifi-digital/pos-tools/components/ResponsiveGrid.js';

export function WorkOrderSaved({ workOrder }: { workOrder: DetailedWorkOrder }) {
  const title = `Work order ${workOrder.name} saved`;

  const router = useRouter();
  const screen = useScreen();
  screen.setTitle(title);

  const hasUnsourcedItems = getUnsourcedWorkOrderItems(workOrder).length > 0;

  return (
    <ScrollView>
      <Stack direction={'horizontal'} alignment={'center'} paddingVertical={'ExtraLarge'}>
        <Stack direction={'vertical'} alignment={'center'} paddingVertical={'ExtraLarge'}>
          <Text variant={'headingLarge'}>{title}</Text>
        </Stack>
      </Stack>
      <ResponsiveGrid columns={2}>
        <Button title={'Back to work order'} onPress={() => router.popCurrent()} />

        <Button
          title={'Manage payments'}
          onPress={async () => {
            await router.popCurrent();
            router.push('PaymentOverview', { name: workOrder.name });
          }}
        />
        {hasUnsourcedItems && (
          <Button
            title={'Sourcing'}
            onPress={async () => {
              await router.popCurrent();
              router.push('WorkOrderItemSourcing', { name: workOrder.name });
            }}
          />
        )}
      </ResponsiveGrid>
    </ScrollView>
  );
}
