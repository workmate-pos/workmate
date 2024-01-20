import { StringAttribute } from '../StringAttribute.js';

/**
 * Attribute that can be added to (draft) orders/carts to indicate that it is a work order.
 * Used to detect which work order a POS order was created for.
 * Since this attribute can be changed in shopify admin it should not be relied on for detecting work orders after order creation within POS.
 * Instead, query the database using order ids to find which work order belongs to some (draft) order.
 */
export const WorkOrderAttribute = new StringAttribute('Work Order');
