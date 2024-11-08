import { CreatePurchaseOrder } from '@web/schemas/generated/create-purchase-order.js';

type BaseCreatePurchaseOrder = {
  status: string;
  locationId: CreatePurchaseOrder['locationId'] | null;
};

export const defaultCreatePurchaseOrder = (base: BaseCreatePurchaseOrder): CreatePurchaseOrder => ({
  ...base,
  name: null,
  note: '',
  placedDate: null,
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
});
