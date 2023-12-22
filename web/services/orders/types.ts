import type {
  ID,
  Money,
  OrderDisplayFinancialStatus,
  OrderDisplayFulfillmentStatus,
} from '../gql/queries/generated/schema.js';

export type Order = {
  id: ID;
  name: string;
  workOrderName: string | null;
  note: string | null;
  tax: Money;
  shipping: Money;
  total: Money;
  subtotal: Money;
  discount: Money;
  outstanding: Money;
  received: Money;
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
  customer: {
    id: ID;
    displayName: string;
  } | null;
  outstanding: Money;
  received: Money;
};
