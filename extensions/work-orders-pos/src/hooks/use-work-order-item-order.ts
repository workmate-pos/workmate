import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { useWorkOrderQuery } from '@work-orders/common/queries/use-work-order-query.js';
import { WIPCreateWorkOrder } from '../create-work-order/reducer.js';

export function useWorkOrderOrders(createWorkOrder: WIPCreateWorkOrder) {
  const fetch = useAuthenticatedFetch();
  const workOrderQuery = useWorkOrderQuery({ fetch, name: createWorkOrder.name });
  const workOrder = workOrderQuery.data?.workOrder;

  const itemUuids = createWorkOrder.items.map(item => item.uuid);
  const hourlyLabourUuids = createWorkOrder.charges
    .filter(charge => charge.type === 'hourly-labour')
    .map(charge => charge.uuid);
  const fixedPriceLabourUuids = createWorkOrder.charges
    .filter(charge => charge.type === 'fixed-price-labour')
    .map(charge => charge.uuid);

  return {
    workOrderQuery,

    orderByItemUuid: Object.fromEntries(
      itemUuids.map(itemUuid => {
        const item = workOrder?.items.find(item => item.uuid === itemUuid);
        const order = workOrder?.orders.find(order => order.id === item?.shopifyOrderLineItem?.orderId) ?? null;
        return [itemUuid, order];
      }),
    ),

    orderByHourlyLabourUuid: Object.fromEntries(
      hourlyLabourUuids.map(hourlyLabourUuid => {
        const hourlyLabour = workOrder?.charges.find(charge => charge.uuid === hourlyLabourUuid);
        const order = workOrder?.orders.find(order => order.id === hourlyLabour?.shopifyOrderLineItem?.orderId) ?? null;
        return [hourlyLabourUuid, order];
      }),
    ),

    orderByFixedPriceLabourUuid: Object.fromEntries(
      fixedPriceLabourUuids.map(fixedPriceLabourUuid => {
        const fixedPriceLabour = workOrder?.charges.find(charge => charge.uuid === fixedPriceLabourUuid);
        const order =
          workOrder?.orders.find(order => order.id === fixedPriceLabour?.shopifyOrderLineItem?.orderId) ?? null;
        return [fixedPriceLabourUuid, order];
      }),
    ),
  };
}
