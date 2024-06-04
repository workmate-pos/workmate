import type { WorkOrder } from '@web/services/work-orders/types.js';
import type { CreateWorkOrder } from '@web/schemas/generated/create-work-order.js';
import type { CreateWorkOrderCharge, CreateWorkOrderItem } from '../types.js';

export function workOrderToCreateWorkOrder(workOrder: WorkOrder): CreateWorkOrder {
  return {
    name: workOrder.name,
    derivedFromOrderId: workOrder.derivedFromOrderId,
    note: workOrder.note,
    internalNote: workOrder.internalNote,
    dueDate: workOrder.dueDate,
    status: workOrder.status,
    customerId: workOrder.customerId,
    items: workOrder.items.map(mapItem),
    charges: workOrder.charges.map(mapCharge),
    customFields: workOrder.customFields,
    discount: workOrder.discount,
  };
}

function mapItem(item: WorkOrder['items'][number]): CreateWorkOrderItem {
  return {
    productVariantId: item.productVariantId,
    quantity: item.quantity,
    uuid: item.uuid,
    absorbCharges: item.absorbCharges,
    customFields: item.customFields,
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
      hoursLocked: charge.hoursLocked,
      rateLocked: charge.rateLocked,
      removeLocked: charge.removeLocked,
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
      amountLocked: charge.amountLocked,
      removeLocked: charge.removeLocked,
    };
  }

  return charge satisfies never;
}
