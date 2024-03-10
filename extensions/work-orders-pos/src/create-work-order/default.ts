import { DateTime } from '@web/schemas/generated/create-work-order.js';
import { WIPCreateWorkOrder } from './reducer.js';

const MINUTE_IN_MS = 1000 * 60;
const HOUR_IN_MS = MINUTE_IN_MS * 60;
const DAY_IN_MS = HOUR_IN_MS * 24;
const WEEK_IN_MS = DAY_IN_MS * 7;

export type CreateWorkOrderBase = {
  status: string;
};

export const defaultCreateWorkOrder = (base: CreateWorkOrderBase): WIPCreateWorkOrder => ({
  ...base,
  name: null,
  note: '',
  derivedFromOrderId: null,
  dueDate: new Date(
    Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()) + WEEK_IN_MS,
  ).toISOString() as DateTime,
  charges: [],
  items: [],
  customerId: null,
});
