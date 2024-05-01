import { DateTime } from '@web/schemas/generated/create-work-order.js';
import { WIPCreateWorkOrder } from './reducer.js';
import { WEEK_IN_MS } from '@work-orders/common/time/constants.js';

export type CreateWorkOrderBase = {
  status: string;
};

export const defaultCreateWorkOrder = (base: CreateWorkOrderBase): WIPCreateWorkOrder => ({
  ...base,
  name: null,
  note: '',
  internalNote: '',
  derivedFromOrderId: null,
  dueDate: new Date(
    Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()) + WEEK_IN_MS,
  ).toISOString() as DateTime,
  charges: [],
  items: [],
  customerId: null,
  customFields: {},
  discount: null,
});
