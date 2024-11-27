import { Session } from '@shopify/shopify-api';
import { getSpecialOrder, getSpecialOrderLineItems, getSpecialOrdersPage } from './queries.js';
import { getShopifyOrdersForSpecialOrder } from '../orders/queries.js';
import {
  getPurchaseOrderLineItemsForSpecialOrders,
  getPurchaseOrderReceiptLineItemsForSpecialOrder,
  getPurchaseOrdersForSpecialOrder,
} from '../purchase-orders/queries.js';
import { getWorkOrdersForSpecialOrder } from '../work-orders/queries.js';
import { getCustomerForSpecialOrder } from '../customer/queries.js';
import { getLocationForSpecialOrder } from '../locations/queries.js';
import { DateTime } from '../gql/queries/generated/schema.js';
import { hasPropertyValue } from '@teifi-digital/shopify-app-toolbox/guards';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import {
  OrderState,
  PurchaseOrderState,
  SpecialOrderPaginationOptions,
} from '../../schemas/generated/special-order-pagination-options.js';
import { escapeLike } from '../db/like.js';
import { pick } from '@teifi-digital/shopify-app-toolbox/object';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';

export async function getDetailedSpecialOrder({ shop }: Session, name: string, locationIds: ID[] | null) {
  const specialOrder = await getSpecialOrder({ shop, name, locationIds });

  if (!specialOrder) {
    return null;
  }

  const [
    shopifyOrders,
    purchaseOrders,
    workOrders,
    customer,
    location,
    specialOrderLineItems,
    purchaseOrderLineItems,
    purchaseOrderReceiptLineItems,
  ] = await Promise.all([
    getShopifyOrdersForSpecialOrder(specialOrder.id),
    getPurchaseOrdersForSpecialOrder(specialOrder.id),
    getWorkOrdersForSpecialOrder(specialOrder.id),
    getCustomerForSpecialOrder(specialOrder.id),
    getLocationForSpecialOrder(specialOrder.id),
    getSpecialOrderLineItems(specialOrder.id),
    getPurchaseOrderLineItemsForSpecialOrders([specialOrder.id]),
    getPurchaseOrderReceiptLineItemsForSpecialOrder(specialOrder.id),
  ]);

  const purchaseOrderState: PurchaseOrderState = purchaseOrderLineItems.every(li => {
    const receivedQuantity = purchaseOrderReceiptLineItems
      .filter(hasPropertyValue('purchaseOrderId', li.purchaseOrderId))
      .filter(hasPropertyValue('lineItemUuid', li.uuid))
      .map(li => li.quantity)
      .reduce((a, b) => a + b, 0);

    return receivedQuantity >= li.quantity;
  })
    ? 'all-received'
    : 'not-all-received';

  const orderState: OrderState = specialOrderLineItems.every(li => {
    const orderedQuantity = purchaseOrderLineItems
      .filter(hasPropertyValue('specialOrderLineItemId', li.id))
      .map(li => li.quantity)
      .reduce((a, b) => a + b, 0);

    return orderedQuantity >= li.quantity;
  })
    ? 'fully-ordered'
    : 'not-fully-ordered';

  return {
    name: specialOrder.name,
    note: specialOrder.note,
    requiredBy: (specialOrder.requiredBy?.toISOString() ?? null) as DateTime | null,
    companyId: specialOrder.companyId,
    companyLocationId: specialOrder.companyLocationId,
    companyContactId: specialOrder.companyContactId,
    purchaseOrderState,
    orderState,
    customer: {
      id: customer.customerId,
      ...pick(customer, 'displayName', 'firstName', 'lastName', 'email', 'phone', 'address'),
    },
    location: {
      id: location.locationId,
      name: location.name,
    },
    workOrders: workOrders.map(wo => pick(wo, 'name', 'status', 'orderIds')),
    orders: shopifyOrders.map(order => ({
      id: order.orderId,
      name: order.name,
      type: order.orderType,
    })),
    purchaseOrders: purchaseOrders.map(po => {
      const lineItems = purchaseOrderLineItems.filter(hasPropertyValue('purchaseOrderId', po.id));

      const orderedQuantity = lineItems.reduce((acc, lineItem) => acc + lineItem.quantity, 0);
      const availableQuantity = purchaseOrderReceiptLineItems
        .filter(hasPropertyValue('purchaseOrderId', po.id))
        .reduce((acc, lineItem) => acc + lineItem.quantity, 0);

      return {
        name: po.name,
        status: po.status,
        supplierId: po.supplierId,
        orderedQuantity,
        availableQuantity,
      };
    }),
    lineItems: specialOrderLineItems.map(lineItem => ({
      uuid: lineItem.uuid,
      quantity: lineItem.quantity,
      productVariantId: lineItem.productVariantId,
      shopifyOrderLineItem:
        lineItem.shopifyOrderLineItem.shopifyOrderLineItemId !== null &&
        lineItem.shopifyOrderLineItem.shopifyOrderId !== null &&
        lineItem.shopifyOrderLineItem.shopifyOrderLineItemQuantity !== null
          ? {
              id: lineItem.shopifyOrderLineItem.shopifyOrderLineItemId,
              orderId: lineItem.shopifyOrderLineItem.shopifyOrderId,
              quantity: lineItem.shopifyOrderLineItem.shopifyOrderLineItemQuantity,
            }
          : null,
      purchaseOrderLineItems: purchaseOrderLineItems
        .filter(hasPropertyValue('specialOrderLineItemId', lineItem.id))
        .map(lineItem => ({
          purchaseOrderName: purchaseOrders.find(hasPropertyValue('id', lineItem.purchaseOrderId))?.name ?? never(),
          quantity: lineItem.quantity,
          availableQuantity: purchaseOrderReceiptLineItems
            .filter(hasPropertyValue('purchaseOrderId', lineItem.purchaseOrderId))
            .filter(hasPropertyValue('lineItemUuid', lineItem.uuid))
            .map(li => li.quantity)
            .reduce((a, b) => a + b, 0),
        })),
    })),
  };
}

export async function getDetailedSpecialOrdersPage(
  session: Session,
  paginationOptions: SpecialOrderPaginationOptions,
  locationIds: ID[] | null,
) {
  if (paginationOptions.query !== undefined) {
    paginationOptions.query = `%${escapeLike(paginationOptions.query)}%`;
  }

  const { shop } = session;
  const { specialOrders, hasNextPage } = await getSpecialOrdersPage(shop, paginationOptions, locationIds);

  return {
    specialOrders: await Promise.all(
      specialOrders.map(specialOrder =>
        getDetailedSpecialOrder(session, specialOrder.name, locationIds).then(so => so ?? never()),
      ),
    ),
    hasNextPage,
  };
}
