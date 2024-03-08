import type { getPurchaseOrder } from './get.js';

// TODO: Change this to include all the stuff from the database
export type PurchaseOrder = Awaited<ReturnType<typeof getPurchaseOrder>>;

// purchase orders exist entirely in our own database, so we can afford to fetch the full object for lower latency on the front end -> better UX
export type PurchaseOrderInfo = Awaited<ReturnType<typeof getPurchaseOrder>>;
