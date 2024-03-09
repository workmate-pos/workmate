import type { getPurchaseOrder } from './get.js';

export type PurchaseOrder = NonNullable<Awaited<ReturnType<typeof getPurchaseOrder>>>;

// purchase orders exist entirely in our own database, so we can afford to fetch the full object for lower latency on the front end -> better UX
export type PurchaseOrderInfo = PurchaseOrder;
