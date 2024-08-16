import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { getShopifyOrderLineItemReservations } from './queries.js';
import { getPurchaseOrderLineItemsByShopifyOrderLineItemIds } from '../purchase-orders/queries.js';
import { getTransferOrderLineItemsByShopifyOrderLineItemIds } from '../stock-transfers/queries.js';
import { sum } from '@teifi-digital/shopify-app-toolbox/array';

export async function getLineItemSources(lineItemId: ID) {
  const [lineItemReservations, purchaseOrderLineItems, stockTransferLineItems] = await Promise.all([
    getShopifyOrderLineItemReservations({ lineItemId }),
    getPurchaseOrderLineItemsByShopifyOrderLineItemIds([lineItemId]),
    getTransferOrderLineItemsByShopifyOrderLineItemIds([lineItemId]),
  ]);

  return {
    reservations: sum(lineItemReservations.map(reservation => reservation.quantity)),
    transferOrders: sum(stockTransferLineItems.map(lineItem => lineItem.quantity)),
    purchaseOrders: sum(purchaseOrderLineItems.map(lineItem => lineItem.quantity)),
  };
}
