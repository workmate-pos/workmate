import { WorkOrderOrder } from '@web/services/work-orders/types.js';
import { Fetch } from './fetch.js';
import { useWorkOrderQuery } from './use-work-order-query.js';
import { DiscriminatedUnionPick } from '../types/DiscriminatedUnionPick.js';
import { CreateWorkOrder } from '@web/schemas/generated/create-work-order.js';

export function useWorkOrderOrders({ fetch, workOrderName }: { fetch: Fetch; workOrderName: string | null }) {
  const workOrderQuery = useWorkOrderQuery({ fetch, name: workOrderName });
  const workOrder = workOrderQuery.data?.workOrder;

  function getHourlyLabourOrder(charge?: { uuid: string }): WorkOrderOrder | null {
    const hourlyLabour = workOrder?.charges.find(c => c.uuid === charge?.uuid);
    return workOrder?.orders.find(order => order.id === hourlyLabour?.shopifyOrderLineItem?.orderId) ?? null;
  }

  function getFixedPriceLabourOrder(charge?: { uuid: string }): WorkOrderOrder | null {
    const fixedPriceLabour = workOrder?.charges.find(c => c.uuid === charge?.uuid);
    return workOrder?.orders.find(order => order.id === fixedPriceLabour?.shopifyOrderLineItem?.orderId) ?? null;
  }

  function getChargeOrder(
    charge?: DiscriminatedUnionPick<CreateWorkOrder['charges'][number], 'type' | 'uuid'> | null,
  ): WorkOrderOrder | null {
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
    getHourlyLabourOrder,
    getFixedPriceLabourOrder,
    getChargeOrder,
  };
}
