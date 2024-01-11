import type {
  ID,
  Money,
  OrderDisplayFinancialStatus,
  OrderDisplayFulfillmentStatus,
} from '../gql/queries/generated/schema.js';

export type Order = {
  id: ID;
  name: string;
  note: string | null;
  total: Money;
  displayFulfillmentStatus: OrderDisplayFulfillmentStatus;
  displayFinancialStatus: OrderDisplayFinancialStatus | null;
  outstanding: Money;
  received: Money;
  discount: Money;
  tax: Money;
  customer: {
    id: ID;
    displayName: string;
  } | null;
  workOrder: {
    name: string;
  } | null;
};

/**
 * Like {@link Order}, but only basic info for showing order lists.
 */
export type OrderInfo = {
  id: ID;
  name: string;
  workOrderName: string | null;
  total: Money;
  displayFulfillmentStatus: OrderDisplayFulfillmentStatus;
  displayFinancialStatus: OrderDisplayFinancialStatus | null;
  outstanding: Money;
  received: Money;
  customer: {
    id: ID;
    displayName: string;
  } | null;
};
