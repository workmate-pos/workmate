import { CreateWorkOrder } from '@web/schemas/generated/create-work-order.js';

export type CreateWorkOrderItem = CreateWorkOrder['items'][number];
export type CreateWorkOrderCharge = CreateWorkOrder['charges'][number];
