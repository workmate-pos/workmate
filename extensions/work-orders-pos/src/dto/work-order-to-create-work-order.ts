import type { WorkOrder } from '@web/services/work-orders/types.js';
import type { CreateWorkOrder } from '@web/schemas/generated/create-work-order.js';
import { uuid } from '../util/uuid.js';
import type { ID, Int } from '@web/services/gql/queries/generated/schema.js';
import { CreateWorkOrderCharge } from '../types.js';

// TODO: Handle thrown errors
export function workOrderToCreateWorkOrder(workOrder: WorkOrder): CreateWorkOrder {
  return {
    name: workOrder.name,
    derivedFromOrderId: workOrder.derivedFromOrder?.id ?? null,
    description: workOrder.description,
    dueDate: workOrder.dueDate,
    status: workOrder.status,
    customerId: workOrder.customerId,
    discount: workOrder.order.discount,
    lineItems: getCreateWorkOrderLineItems(workOrder),
    charges: workOrder.charges.map(mapLabour),
  };
}

function getProductVariantChargeUuids({ charges }: Pick<WorkOrder, 'charges'>) {
  const productVariantUuids: Record<ID, Set<string>> = {};

  for (const { productVariantId, lineItemUuid } of charges) {
    if (!productVariantId || !lineItemUuid) continue;
    (productVariantUuids[productVariantId] ??= new Set()).add(lineItemUuid);
  }

  return productVariantUuids;
}

export function getCreateWorkOrderLineItems(
  workOrder: Pick<WorkOrder, 'charges' | 'order'>,
): CreateWorkOrder['lineItems'] {
  // WorkOrder -> CreateWorkOrder is a near-one-to-one mapping, but we need to do some transformations because
  // 1) We make no assumptions about the stacking of line items
  //  - (POS is unable to have multiple stacks, but (draft) orders can do it)
  // 2) We receive line items without UUIDs (they are used internally by POS to identify different stacks of the same product variant id, BUT
  //  - uuids are used internally to distinguish between different line items
  //  - these line item uuids are used by charges to assign them to specific line items with the same product variant id

  // To address these concerns, we can simply create a new uuid() for all line items **after** ensuring that we create a line item
  // for every uuid that has labour assignment(s).
  // Afterwards we also ensure that mutable service items are never stacked

  // TODO: Fix bug with adding multiple fixed services makes them reset

  const productVariantChargeUuids = getProductVariantChargeUuids(workOrder);

  const lineItems: CreateWorkOrder['lineItems'] = [];

  for (const { variant, quantity } of workOrder.order.lineItems) {
    if (!variant) {
      // Custom sales are not supported within POS.
      // So we can safely ignore them as they are guaranteed to be labour charges, which are stored in WorkOrder.labour.
      continue;
    }

    const uuids = productVariantChargeUuids[variant.id];

    let remainingQuantity = quantity;

    if (uuids) {
      for (const uuid of uuids) {
        if (remainingQuantity === 0) break;

        lineItems.push({
          productVariantId: variant.id,
          quantity: 1 as Int,
          uuid,
        });

        uuids.delete(uuid);
        remainingQuantity--;
      }
    }

    if (remainingQuantity === 0) continue;

    // mutable service items use quantity to set the total price - so we only need to create one line item per charge.
    // we can ignore the remaining quantity
    if (!variant.product.isMutableServiceItem) {
      lineItems.push({
        productVariantId: variant.id,
        uuid: uuid(),
        quantity: remainingQuantity,
      });
    } else if (!uuids) {
      // however if there are no charges we should create one
      lineItems.push({
        productVariantId: variant.id,
        quantity: 1 as Int,
        uuid: uuid(),
      });
    }
  }

  for (const [productVariantId, uuids] of Object.entries(productVariantChargeUuids)) {
    if (uuids.size !== 0) {
      throw new Error(`Not all charges for product ${productVariantId} have a corresponding line item`);
    }
  }

  return lineItems;
}

function mapLabour(labour: WorkOrder['charges'][number]): CreateWorkOrderCharge {
  if (labour.type === 'hourly-labour') {
    return {
      type: 'hourly-labour',
      lineItemUuid: labour.lineItemUuid,
      employeeId: labour.employeeId,
      chargeUuid: uuid(),
      hours: labour.hours,
      rate: labour.rate,
      name: labour.name,
    };
  }

  if (labour.type === 'fixed-price-labour') {
    return {
      type: 'fixed-price-labour',
      lineItemUuid: labour.lineItemUuid,
      employeeId: labour.employeeId,
      amount: labour.amount,
      chargeUuid: uuid(),
      name: labour.name,
    };
  }

  return labour satisfies never;
}
