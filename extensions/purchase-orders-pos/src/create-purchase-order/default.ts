import { CreatePurchaseOrder } from '@web/schemas/generated/create-purchase-order.js';

export const defaultCreatePurchaseOrder: CreatePurchaseOrder = {
  status: 'OPEN',
  customerId: null,
  name: null,
  note: '',
  salesOrderId: null,
  workOrderId: null,
  locationId: null,
  products: [],
  customFields: {},
  vendorCustomerId: null,
};
