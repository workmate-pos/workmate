import { CreateWorkOrder } from '@web/schemas/generated/create-work-order.js';

export type CreateWorkOrderLineItem = CreateWorkOrder['lineItems'][number];
export type CreateWorkOrderCharge = CreateWorkOrder['charges'][number];
