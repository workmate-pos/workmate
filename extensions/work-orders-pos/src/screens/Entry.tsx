import { useScreen } from '../hooks/use-screen';
import { Button, Stack } from '@shopify/retail-ui-extensions-react';

export function Entry() {
  const { Screen, navigate } = useScreen('Entry');

  return (
    <Screen title="Work Orders">
      <Stack alignment="center" direction="vertical" flex={1} paddingHorizontal="ExtraExtraLarge">
        <Button
          title="New Work Order"
          type="primary"
          onPress={() => navigate('WorkOrder', { type: 'new-work-order' })}
        />
        <Button title="Active Work Orders" onPress={() => navigate('WorkOrderSelector', { filter: 'active' })} />
        <Button
          title="Historical Work Orders"
          onPress={() => navigate('WorkOrderSelector', { filter: 'historical' })}
        />
      </Stack>
    </Screen>
  );
}