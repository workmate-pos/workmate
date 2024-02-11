import { CreatePurchaseOrder } from '@web/schemas/generated/create-purchase-order.js';

export const defaultCreatePurchaseOrder: CreatePurchaseOrder = {
  status: 'OPEN',
  customerId: null,
  name: null,
  note: null,
  salesOrderId: null,
  workOrderName: null,
  locationId: null,
  products: [],
  customFields: {},
  vendorCustomerId: null,
  vendorName: null,
  customerName: null,
  locationName: null,
  shipTo: null,
  shipFrom: null,
};
