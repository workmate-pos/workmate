import { DetailedPurchaseOrder } from '@web/services/purchase-orders/types.js';
import { CreatePurchaseOrder } from '@web/schemas/generated/create-purchase-order.js';

export function createPurchaseOrderFromPurchaseOrder(purchaseOrder: DetailedPurchaseOrder): CreatePurchaseOrder {
  return {
    lineItems: purchaseOrder.lineItems.map(lineItem => ({
      uuid: lineItem.uuid,
      specialOrderLineItem: lineItem.specialOrderLineItem
        ? {
            name: lineItem.specialOrderLineItem.name,
            uuid: lineItem.specialOrderLineItem.uuid,
          }
        : null,
      serialNumber: lineItem.serial?.serial ?? null,
      availableQuantity: lineItem.availableQuantity,
      productVariantId: lineItem.productVariant.id,
      quantity: lineItem.quantity,
      unitCost: lineItem.unitCost,
      customFields: lineItem.customFields,
    })),
    name: purchaseOrder.name,
    placedDate: purchaseOrder.placedDate,
    tax: purchaseOrder.tax,
    discount: purchaseOrder.discount,
    paid: purchaseOrder.paid,
    shipFrom: purchaseOrder.shipFrom,
    shipping: purchaseOrder.shipping,
    shipTo: purchaseOrder.shipTo,
    deposited: purchaseOrder.deposited,
    customFields: purchaseOrder.customFields,
    note: purchaseOrder.note,
    vendorName: purchaseOrder.vendorName,
    status: purchaseOrder.status,
    locationId: purchaseOrder.location?.id ?? null,
    employeeAssignments: purchaseOrder.employeeAssignments.map(employeeAssignment => ({
      employeeId: employeeAssignment.employeeId,
    })),
  };
}
