import { Session } from '@shopify/shopify-api';
import { getSpecialOrder, getSpecialOrderLineItems, getSpecialOrdersPage } from './queries.js';
import { getShopifyOrdersForSpecialOrder } from '../orders/queries.js';
import { getPurchaseOrdersForSpecialOrder } from '../purchase-orders/queries.js';
import { getWorkOrdersForSpecialOrder } from '../work-orders/queries.js';
import { getCustomerForSpecialOrder } from '../customer/queries.js';
import { getLocationForSpecialOrder } from '../locations/queries.js';
import { DateTime } from '../gql/queries/generated/schema.js';
import { hasPropertyValue } from '@teifi-digital/shopify-app-toolbox/guards';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import { SpecialOrderPaginationOptions } from '../../schemas/generated/special-order-pagination-options.js';
import { escapeLike } from '../db/like.js';

export async function getDetailedSpecialOrder({ shop }: Session, name: string) {
  const specialOrder = await getSpecialOrder({ shop, name });

  if (!specialOrder) {
    return null;
  }

  const [shopifyOrders, purchaseOrders, workOrders, customer, location, lineItems] = await Promise.all([
    getShopifyOrdersForSpecialOrder(specialOrder.id),
    getPurchaseOrdersForSpecialOrder(specialOrder.id),
    getWorkOrdersForSpecialOrder(specialOrder.id),
    getCustomerForSpecialOrder(specialOrder.id),
    getLocationForSpecialOrder(specialOrder.id),
    getSpecialOrderLineItems(specialOrder.id),
  ]);

  return {
    name: specialOrder.name,
    note: specialOrder.note,
    requiredBy: specialOrder.requiredBy?.toISOString() as DateTime | null,
    companyId: specialOrder.companyId,
    companyLocationId: specialOrder.companyLocationId,
    companyContactId: specialOrder.companyContactId,
    customer: {
      id: customer.customerId,
      displayName: customer.displayName,
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
    },
    location: {
      id: location.locationId,
      name: location.name,
    },
    workOrders: workOrders.map(wo => ({
      name: wo.name,
      status: wo.status,
      orderIds: wo.orderIds,
    })),
    orders: shopifyOrders.map(order => ({
      id: order.orderId,
      name: order.name,
      type: order.orderType,
    })),
    purchaseOrders: purchaseOrders.map(po => ({
      name: po.name,
      status: po.status,
      vendorName: po.vendorName,
    })),
    // TODO: Special orders
    lineItems: lineItems.map(lineItem => ({
      uuid: lineItem.uuid,
      quantity: lineItem.quantity,
      productVariantId: lineItem.productVariantId,
      shopifyOrderLineItemId: lineItem.shopifyOrderLineItemId,
      purchaseOrderLineItems: lineItem.purchaseOrderLineItems.map(lineItem => ({
        purchaseOrderName: purchaseOrders.find(hasPropertyValue('id', lineItem.purchaseOrderId))?.name ?? never(),
        quantity: lineItem.quantity,
        availableQuantity: lineItem.availableQuantity,
      })),
    })),
  };
}

export async function getDetailedSpecialOrdersPage(session: Session, paginationOptions: SpecialOrderPaginationOptions) {
  if (paginationOptions.query !== undefined) {
    paginationOptions.query = `%${escapeLike(paginationOptions.query)}%`;
  }

  const { shop } = session;
  const { specialOrders, hasNextPage } = await getSpecialOrdersPage(shop, paginationOptions);

  return {
    specialOrders: await Promise.all(
      specialOrders.map(specialOrder => getDetailedSpecialOrder(session, specialOrder.name).then(so => so ?? never())),
    ),
    hasNextPage,
  };
}
