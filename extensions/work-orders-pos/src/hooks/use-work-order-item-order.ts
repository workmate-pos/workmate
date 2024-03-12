import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { useWorkOrderQuery } from '@work-orders/common/queries/use-work-order-query.js';

export function useWorkOrderItemOrder(name: string, itemUuid: string) {
  const fetch = useAuthenticatedFetch();
  const workOrderQuery = useWorkOrderQuery({ fetch, name });
  const workOrder = workOrderQuery.data?.workOrder;

  const item = workOrder?.items.find(item => item.uuid === itemUuid);
  const order = workOrder?.orders.find(order => order.id === item?.shopifyOrderLineItem?.orderId) ?? null;

  return { workOrderQuery, order };
}

export function useWorkOrderHourlyLabourChargeOrder(name: string, chargeUuid: string) {
  const fetch = useAuthenticatedFetch();
  const workOrderQuery = useWorkOrderQuery({ fetch, name });
  const workOrder = workOrderQuery.data?.workOrder;

  const charge = workOrder?.charges.find(charge => charge.uuid === chargeUuid);
  const order = workOrder?.orders.find(order => order.id === charge?.shopifyOrderLineItem?.orderId) ?? null;

  return { workOrderQuery, order };
}

export function useWorkOrderFixedPriceLabourChargeOrder(name: string, chargeUuid: string) {
  const fetch = useAuthenticatedFetch();
  const workOrderQuery = useWorkOrderQuery({ fetch, name });
  const workOrder = workOrderQuery.data?.workOrder;

  const charge = workOrder?.charges.find(charge => charge.uuid === chargeUuid);
  const order = workOrder?.orders.find(order => order.id === charge?.shopifyOrderLineItem?.orderId) ?? null;

  return { workOrderQuery, order };
}
