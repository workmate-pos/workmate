import { useState } from 'react';
import { useScreen } from '../../hooks/use-screen';
import type { WorkOrder } from '../WorkOrder';
import { Button, ScrollView, Stack, Text } from '@shopify/retail-ui-extensions-react';

// TODO: Do error messages, etc, here instead of in the WorkOrder screen
export function WorkOrderOverview() {
  const [workOrder, setWorkOrder] = useState<Partial<WorkOrder> | null>(null);
  const { Screen } = useScreen('WorkOrderOverview', setWorkOrder);

  // TODO: After saving, reload
  return (
    <Screen title="Overview" presentation={{ sheet: true }}>
      <ScrollView>
        <Stack direction={'vertical'}>
          <Text variant="headingLarge">Work Orders</Text>
          <Stack direction={'horizontal'} flexChildren>
            <Button title={'Back'} />
            <Button title={'Save'} type={'primary'} />
          </Stack>
        </Stack>
      </ScrollView>
    </Screen>
  );
}
