import { useScreen } from '@teifi-digital/pos-tools/router';
import { WorkOrder } from '../WorkOrder.js';
import { useWorkOrderQuery } from '@work-orders/common/queries/use-work-order-query.js';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { workOrderToCreateWorkOrder } from '@work-orders/common/create-work-order/work-order-to-create-work-order.js';
import { ResponsiveStack } from '@teifi-digital/pos-tools/components/ResponsiveStack.js';
import { Text } from '@shopify/ui-extensions-react/point-of-sale';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';

export function WorkOrderLoader({ name }: { name: string }) {
  const fetch = useAuthenticatedFetch();
  const workOrderQuery = useWorkOrderQuery({ fetch, name });

  const screen = useScreen();
  screen.setIsLoading(workOrderQuery.isFetching);

  if (workOrderQuery.isLoading) {
    return null;
  }

  if (workOrderQuery.isError) {
    return (
      <ResponsiveStack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
        <Text color="TextCritical" variant="body">
          Could not load work order: {extractErrorMessage(workOrderQuery.error, 'unknown error')}
        </Text>
      </ResponsiveStack>
    );
  }

  if (!workOrderQuery.data?.workOrder) {
    return (
      <ResponsiveStack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
        <Text color="TextCritical" variant="body">
          Work order not found
        </Text>
      </ResponsiveStack>
    );
  }

  return <WorkOrder initial={workOrderToCreateWorkOrder(workOrderQuery.data.workOrder)} />;
}
