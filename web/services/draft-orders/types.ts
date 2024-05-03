import type { ID, Money } from '../gql/queries/generated/schema.js';

export type DraftOrder = {
  id: ID;
  name: string;
  note: string | null;
  total: Money;
  discount: Money | null;
  tax: Money | null;
  customer: {
    id: ID;
    displayName: string;
  } | null;
  workOrders: { name: string }[];
};

export type DraftOrderInfo = {
  id: ID;
  name: string;
  workOrders: { name: string }[];
  total: Money;
  customer: {
    id: ID;
    displayName: string;
  } | null;
};
