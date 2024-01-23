import { CreateWorkOrder, DateTime } from '@web/schemas/generated/create-work-order.js';
import { Nullable } from '@work-orders/common/types/Nullable.js';

export const defaultCreateWorkOrder: Nullable<CreateWorkOrder> = {
  name: null,
  description: '',
  status: null,
  derivedFromOrderId: null,
  dueDate: new Date(
    Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()) + 1000 * 60 * 60 * 24 * 7,
  ).toISOString() as DateTime,
  labour: [],
  lineItems: [],
  customerId: null,
  discount: null,
};
