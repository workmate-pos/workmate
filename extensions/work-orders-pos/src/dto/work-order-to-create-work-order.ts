import type { WorkOrder } from '@web/services/work-orders/types.js';
import type { CreateWorkOrder } from '@web/schemas/generated/create-work-order.js';
import type { CreateWorkOrderCharge, CreateWorkOrderItem } from '../types.js';

export function workOrderToCreateWorkOrder(workOrder: WorkOrder): CreateWorkOrder {
  return {
    name: workOrder.name,
    derivedFromOrderId: workOrder.derivedFromOrderId,
    note: workOrder.note,
    dueDate: workOrder.dueDate,
    status: workOrder.status,
    customerId: workOrder.customerId,
    items: workOrder.items.map(mapItem),
    charges: workOrder.charges.map(mapCharge),
  };
}

function mapItem(item: WorkOrder['items'][number]): CreateWorkOrderItem {
  return {
    productVariantId: item.productVariantId,
    quantity: item.quantity,
    uuid: item.uuid,
  };
}

function mapCharge(charge: WorkOrder['charges'][number]): CreateWorkOrderCharge {
  if (charge.type === 'hourly-labour') {
    return {
      type: 'hourly-labour',
      workOrderItemUuid: charge.workOrderItemUuid,
      employeeId: charge.employeeId,
      uuid: charge.uuid,
      hours: charge.hours,
      rate: charge.rate,
      name: charge.name,
    };
  }

  if (charge.type === 'fixed-price-labour') {
    return {
      type: 'fixed-price-labour',
      workOrderItemUuid: charge.workOrderItemUuid,
      employeeId: charge.employeeId,
      amount: charge.amount,
      uuid: charge.uuid,
      name: charge.name,
    };
  }

  return charge satisfies never;
}
