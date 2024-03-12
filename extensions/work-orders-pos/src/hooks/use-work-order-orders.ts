import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { useWorkOrderQuery } from '@work-orders/common/queries/use-work-order-query.js';
import { CreateWorkOrderCharge } from '../types.js';
import { DiscriminatedUnionPick } from '@work-orders/common/types/DiscriminatedUnionPick.js';
import { isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';

export function useWorkOrderOrders(workOrderName: string | null) {
  const fetch = useAuthenticatedFetch();
  const workOrderQuery = useWorkOrderQuery({ fetch, name: workOrderName });
  const workOrder = workOrderQuery.data?.workOrder;

  function getItemOrder(item?: { uuid: string }) {
    const workOrderItem = workOrder?.items.find(i => i.uuid === item?.uuid);
    return workOrder?.orders.find(order => order.id === workOrderItem?.shopifyOrderLineItem?.orderId) ?? null;
  }

  function getItemOrdersIncludingCharges(item?: { uuid: string }) {
    const workOrderItem = workOrder?.items.find(i => i.uuid === item?.uuid);
    const itemOrders =
      workOrder?.orders.filter(order => order.id === workOrderItem?.shopifyOrderLineItem?.orderId) ?? [];

    const itemCharges = workOrder?.charges.filter(c => c.workOrderItemUuid === item?.uuid);
    const chargeOrders =
      itemCharges
        ?.map(charge => workOrder?.orders.find(order => order.id === charge.shopifyOrderLineItem?.orderId) ?? null)
        .filter(isNonNullable) ?? [];

    return [...itemOrders, ...chargeOrders];
  }

  function getHourlyLabourOrder(charge?: { uuid: string }) {
    const hourlyLabour = workOrder?.charges.find(c => c.uuid === charge?.uuid);
    return workOrder?.orders.find(order => order.id === hourlyLabour?.shopifyOrderLineItem?.orderId) ?? null;
  }

  function getFixedPriceLabourOrder(charge?: { uuid: string }) {
    const fixedPriceLabour = workOrder?.charges.find(c => c.uuid === charge?.uuid);
    return workOrder?.orders.find(order => order.id === fixedPriceLabour?.shopifyOrderLineItem?.orderId) ?? null;
  }

  function getChargeOrder(charge?: DiscriminatedUnionPick<CreateWorkOrderCharge, 'type' | 'uuid'> | null) {
    if (!charge) return null;

    if (charge.type === 'hourly-labour') {
      return getHourlyLabourOrder(charge);
    } else if (charge.type === 'fixed-price-labour') {
      return getFixedPriceLabourOrder(charge);
    }

    return charge satisfies never;
  }

  return {
    workOrderQuery,
    getItemOrder,
    getItemOrdersIncludingCharges,
    getHourlyLabourOrder,
    getFixedPriceLabourOrder,
    getChargeOrder,
  };
}
