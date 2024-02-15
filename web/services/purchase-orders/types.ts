import { CreatePurchaseOrder } from '../../schemas/generated/create-purchase-order.js';
import { WithNonNullable } from '../../util/types.js';

export type PurchaseOrder = WithNonNullable<CreatePurchaseOrder, 'name'>;

// purchase orders exist entirely in our own database, so we can afford to fetch the full object for lower latency on the front end -> better UX
export type PurchaseOrderInfo = WithNonNullable<CreatePurchaseOrder, 'name'>;
