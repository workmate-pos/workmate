import { CreateSpecialOrder } from '@web/schemas/generated/create-special-order.js';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';

export type WIPCreateSpecialOrder = Omit<CreateSpecialOrder, 'customerId'> & {
  customerId: CreateSpecialOrder['customerId'] | null;
};

export const getDefaultCreateSpecialOrder = (locationId: ID): WIPCreateSpecialOrder => ({
  requiredBy: null,
  companyContactId: null,
  companyLocationId: null,
  customerId: null,
  companyId: null,
  name: null,
  locationId,
  note: '',
  lineItems: [],
});
