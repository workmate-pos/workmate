import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { getShopifyOrderLineItemReservations } from './queries.js';
import { getTransferOrderLineItemsByShopifyOrderLineItemIds } from '../stock-transfers/queries.js';
import { sum } from '@teifi-digital/shopify-app-toolbox/array';
import { getSpecialOrderLineItemsByShopifyOrderLineItemIds } from '../special-orders/queries.js';

export async function getLineItemSources(lineItemId: ID) {
  const [lineItemReservations, specialOrderLineItems, stockTransferLineItems] = await Promise.all([
    getShopifyOrderLineItemReservations({ lineItemId }),
    getSpecialOrderLineItemsByShopifyOrderLineItemIds([lineItemId]),
    getTransferOrderLineItemsByShopifyOrderLineItemIds([lineItemId]),
  ]);

  return {
    reservations: sum(lineItemReservations.map(reservation => reservation.quantity)),
    transferOrders: sum(stockTransferLineItems.map(lineItem => lineItem.quantity)),
    specialOrders: sum(specialOrderLineItems.map(lineItem => lineItem.quantity)),
  };
}
