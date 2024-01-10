import type { Money } from '@web/schemas/generated/shop-settings.js';
import { Button, Text, useExtensionApi } from '@shopify/retail-ui-extensions-react';
import { useWorkOrderQuery } from '@work-orders/common/queries/use-work-order-query.js';
import { useAuthenticatedFetch } from '../hooks/use-authenticated-fetch.js';
import { useSaveWorkOrderMutation } from '@work-orders/common/queries/use-save-work-order-mutation.js';
import { CreateWorkOrder } from '@web/schemas/generated/create-work-order.js';
import { usePaymentHandler } from '../hooks/use-payment-handler.js';
import { Nullable } from '@work-orders/common/types/Nullable.js';
import { useEffect } from 'react';

export function PayButton(
  props: (
    | { createWorkOrder: Nullable<CreateWorkOrder>; workOrderName: null }
    | { createWorkOrder: null; workOrderName: string }
  ) & {
    setLoading?: (isLoading: boolean) => void;
  },
) {
  const fetch = useAuthenticatedFetch();
  const workOrderQuery = useWorkOrderQuery({ fetch, name: props.workOrderName ?? props.createWorkOrder.name });
  const saveWorkOrderMutation = useSaveWorkOrderMutation({ fetch });
  const paymentHandler = usePaymentHandler();

  useEffect(() => {
    props.setLoading?.(saveWorkOrderMutation.isLoading || workOrderQuery.isFetching || paymentHandler.isLoading);
  }, [saveWorkOrderMutation.isLoading, workOrderQuery.isFetching, paymentHandler.isLoading]);

  if (workOrderQuery.data?.workOrder?.order?.type === 'order') {
    // If there is an actual order then any payments should go through there
    if (workOrderQuery.data.workOrder.order.outstanding === ('0.00' as Money)) {
      return (
        <Text variant="body" color="TextSubdued">
          This order has been paid in full.
        </Text>
      );
    }

    // TODO: In the future (when possible) provide a link to the order/allow initiating a payment through here. Not allowed by the POS api yet unfortunately
    return (
      <Text variant="body" color="TextSubdued">
        This order has been partially paid ({workOrderQuery.data.workOrder.order.received} /{' '}
        {workOrderQuery.data.workOrder.order.total}). The remaining balance can be paid through order
        {workOrderQuery.data.workOrder.order.name}
      </Text>
    );
  }

  return (
    <Button
      title="Pay Balance"
      onPress={async () => {
        const name = props.createWorkOrder
          ? await saveWorkOrderMutation.mutateAsync(props.createWorkOrder).then(result => result.name)
          : props.workOrderName;

        if (!name) return;

        const result = await workOrderQuery.refetch();
        const workOrder = result.data?.workOrder;

        if (!workOrder) return;

        await paymentHandler.handlePayment({ workOrder });
      }}
    />
  );
}
