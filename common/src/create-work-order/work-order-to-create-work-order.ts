import type { DetailedWorkOrder } from '@web/services/work-orders/types.js';
import type { CreateWorkOrder } from '@web/schemas/generated/create-work-order.js';

export function workOrderToCreateWorkOrder(workOrder: DetailedWorkOrder): CreateWorkOrder {
  return {
    name: workOrder.name,
    type: workOrder.type,
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
    companyId: workOrder.companyId,
    companyLocationId: workOrder.companyLocationId,
    companyContactId: workOrder.companyContactId,
    paymentTerms: workOrder.paymentTerms,
  };
}

function mapItem(item: DetailedWorkOrder['items'][number]): CreateWorkOrder['items'][number] {
  if (item.type === 'product') {
    return {
      type: 'product',
      productVariantId: item.productVariantId,
      quantity: item.quantity,
      uuid: item.uuid,
      absorbCharges: item.absorbCharges,
      customFields: item.customFields,
    };
  }

  if (item.type === 'custom-item') {
    return {
      type: 'custom-item',
      quantity: item.quantity,
      uuid: item.uuid,
      absorbCharges: item.absorbCharges,
      customFields: item.customFields,
      name: item.name,
      unitPrice: item.unitPrice,
    };
  }

  return item satisfies never;
}

function mapCharge(charge: DetailedWorkOrder['charges'][number]): CreateWorkOrder['charges'][number] {
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
