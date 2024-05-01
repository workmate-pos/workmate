import { PurchaseOrder } from '@web/services/purchase-orders/types.js';
import { CreatePurchaseOrder } from '@web/schemas/generated/create-purchase-order.js';

export function createPurchaseOrderFromPurchaseOrder(purchaseOrder: PurchaseOrder): CreatePurchaseOrder {
  return {
    lineItems: purchaseOrder.lineItems.map(lineItem => ({
      uuid: lineItem.uuid,
      shopifyOrderLineItem: lineItem.shopifyOrderLineItem
        ? {
            id: lineItem.shopifyOrderLineItem.id,
            orderId: lineItem.shopifyOrderLineItem.order.id,
          }
        : null,
      availableQuantity: lineItem.availableQuantity,
      productVariantId: lineItem.productVariant.id,
      quantity: lineItem.quantity,
      unitCost: lineItem.unitCost,
    })),
    name: purchaseOrder.name,
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
