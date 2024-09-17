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
  discount: Money | null;
  tax: Money | null;
  customer: {
    id: ID;
    displayName: string;
  } | null;
  workOrders: { name: string }[];
  customAttributes: { key: string; value: string | null }[];
};

/**
 * Like {@link Order}, but only basic info for showing order lists.
 */
export type OrderInfo = {
  id: ID;
  name: string;
  workOrders: { name: string }[];
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
