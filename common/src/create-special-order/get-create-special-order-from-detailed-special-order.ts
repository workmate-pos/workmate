import { DetailedSpecialOrder } from '@web/services/special-orders/types.js';
import { CreateSpecialOrder } from '@web/schemas/generated/create-special-order.js';
import { pick } from '@teifi-digital/shopify-app-toolbox/object';

export function getCreateSpecialOrderFromDetailedSpecialOrder(specialOrder: DetailedSpecialOrder): CreateSpecialOrder {
  return {
    name: specialOrder.name,
    note: specialOrder.note,
    locationId: specialOrder.location.id,
    customerId: specialOrder.customer.id,
    companyId: specialOrder.companyId,
    companyLocationId: specialOrder.companyLocationId,
    companyContactId: specialOrder.companyContactId,
    requiredBy: specialOrder.requiredBy,
    lineItems: specialOrder.lineItems.map(lineItem => ({
      shopifyOrderLineItem: lineItem.shopifyOrderLineItem ? pick(lineItem.shopifyOrderLineItem, 'id', 'orderId') : null,
      quantity: lineItem.quantity,
      uuid: lineItem.uuid,
      productVariantId: lineItem.productVariantId,
    })),
  };
}
