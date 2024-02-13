import type { Status, Product, CreatePurchaseOrder } from '@web/schemas/generated/create-purchase-order.js';
import type { Location } from '@work-orders/common/queries/use-locations-query.js';
import type { Vendor } from '@work-orders/common/queries/use-vendors-query.js';

export type ScreenInputOutput = {
  Entry: [undefined, undefined];
  PurchaseOrder: [CreatePurchaseOrder | null, undefined];

  CustomFieldConfig: [Pick<CreatePurchaseOrder, 'customFields'>, Record<string, string>];
  EmployeeSelector: [CreatePurchaseOrder['employeeAssignments'], CreatePurchaseOrder['employeeAssignments']];
  LocationSelector: [undefined, Location];
  ProductConfig: [Product, Product];
  ProductSelector: [Pick<CreatePurchaseOrder, 'vendorName' | 'locationName' | 'locationId'>, Product[]];
  StatusSelector: [undefined, Status];
  VendorSelector: [undefined, Vendor];
};
