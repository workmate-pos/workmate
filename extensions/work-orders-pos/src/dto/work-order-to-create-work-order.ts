import type { WorkOrder } from '@web/services/work-orders/types.js';
import type { CreateWorkOrder } from '@web/schemas/generated/create-work-order.js';
import { ID } from '@web/schemas/generated/ids.js';
import { uuid } from '../util/uuid.js';

export function workOrderToCreateWorkOrder(workOrder: WorkOrder): CreateWorkOrder {
  const productVariantUuids = getProductVariantUuids(workOrder.employeeAssignments);

  return {
    name: workOrder.name,
    derivedFromOrderId: workOrder.derivedFromOrder?.id ?? null,
    description: workOrder.description,
    dueDate: workOrder.dueDate,
    status: workOrder.status,
    customerId: workOrder.customerId,
    discount: workOrder.order.discount,
    lineItems: lineItemsToCreateWorkOrderLineItems(workOrder.order.lineItems, productVariantUuids),
    employeeAssignments: employeeAssignmentAttributeToEmployeeAssignments(workOrder.employeeAssignments),
  };
}

/**
 * Create a record mapping product variant ids to their line item uuids as used by employee assignments.
 * This record can then be used to assign line items a uuid that matches the employee assignment.
 */
function getProductVariantUuids(employeeAssignments: WorkOrder['employeeAssignments']): Record<ID, string[]> {
  const productVariantUuids: Record<ID, string[]> = {};

  for (const { productVariantId, lineItemUuid } of employeeAssignments) {
    if (productVariantId && lineItemUuid) {
      productVariantUuids[productVariantId] ??= [];
      if (!productVariantUuids[productVariantId].includes(lineItemUuid)) {
        productVariantUuids[productVariantId].push(lineItemUuid);
      }
    }
  }

  return productVariantUuids;
}

function lineItemsToCreateWorkOrderLineItems(
  lineItems: WorkOrder['order']['lineItems'],
  productVariantUuids: Record<ID, string[]>,
): CreateWorkOrder['lineItems'] {
  return lineItems
    .filter((li): li is typeof li & { variant: NonNullable<(typeof li)['variant']> } => li.variant !== null)
    .filter(li => !li.attributes.labourLineItem && !li.attributes.placeholderLineItem)
    .map(li => ({
      quantity: li.quantity,
      productVariantId: li.variant.id,
      uuid: productVariantUuids[li.variant.id]?.pop() ?? uuid(),
    }));
}

function employeeAssignmentAttributeToEmployeeAssignments(
  employeeAssignments: WorkOrder['employeeAssignments'],
): CreateWorkOrder['employeeAssignments'] {
  return (
    employeeAssignments?.map(ea => ({
      employeeId: ea.employeeId,
      hours: ea.hours,
      lineItemUuid: ea.lineItemUuid,
    })) ?? []
  );
}
