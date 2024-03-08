import { CreatePurchaseOrder } from '@web/schemas/generated/create-purchase-order.js';

export const defaultCreatePurchaseOrder: CreatePurchaseOrder = {
  status: 'OPEN',
  name: null,
  note: '',
  locationId: null,
  customFields: {},
  employeeAssignments: [],
  vendorName: null,
  shipTo: '',
  shipFrom: '',
  deposited: null,
  paid: null,
  tax: null,
  discount: null,
  shipping: null,
  lineItems: [],
};
