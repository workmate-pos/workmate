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
import {
  OrderState,
  PurchaseOrderState,
  SpecialOrderPaginationOptions,
} from '../../schemas/generated/special-order-pagination-options.js';
import { escapeLike } from '../db/like.js';
import { pick } from '@teifi-digital/shopify-app-toolbox/object';
import { sum } from '@teifi-digital/shopify-app-toolbox/array';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';

export async function getDetailedSpecialOrder({ shop }: Session, name: string, locationIds: ID[] | null) {
  const specialOrder = await getSpecialOrder({ shop, name, locationIds });

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

  const purchaseOrderState: PurchaseOrderState = !lineItems
    .flatMap(lineItem => lineItem.purchaseOrderLineItems)
    .some(lineItem => lineItem.availableQuantity < lineItem.quantity)
    ? 'ALL_RECEIVED'
    : 'NOT_ALL_RECEIVED';

  const orderState: OrderState = lineItems.every(
    lineItem => lineItem.quantity <= sum(lineItem.purchaseOrderLineItems.map(lineItem => lineItem.quantity)),
  )
    ? 'FULLY_ORDERED'
    : 'NOT_FULLY_ORDERED';

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
      const purchaseOrderLineItems = lineItems
        .flatMap(lineItem => lineItem.purchaseOrderLineItems)
        .filter(hasPropertyValue('purchaseOrderId', po.id));

      const purchaseOrderQuantity = sum(purchaseOrderLineItems.map(lineItem => lineItem.quantity));
      const purchaseOrderAvailableQuantity = sum(purchaseOrderLineItems.map(lineItem => lineItem.availableQuantity));

      return {
        name: po.name,
        status: po.status,
        vendorName: po.vendorName,
        quantity: purchaseOrderQuantity,
        availableQuantity: purchaseOrderAvailableQuantity,
      };
    }),
    lineItems: lineItems.map(lineItem => ({
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
      purchaseOrderLineItems: lineItem.purchaseOrderLineItems.map(lineItem => ({
        purchaseOrderName: purchaseOrders.find(hasPropertyValue('id', lineItem.purchaseOrderId))?.name ?? never(),
        quantity: lineItem.quantity,
        availableQuantity: lineItem.availableQuantity,
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
