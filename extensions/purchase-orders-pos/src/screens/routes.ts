import type { Status, Product, CreatePurchaseOrder } from '@web/schemas/generated/create-purchase-order.js';
import type { Location } from '@work-orders/common/queries/use-locations-query.js';
import type { Vendor } from '@work-orders/common/queries/use-vendors-query.js';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';

export type ScreenInputOutput = {
  Entry: [undefined, undefined];
  PurchaseOrder: [CreatePurchaseOrder | null, undefined];

  CustomFieldConfig: [Pick<CreatePurchaseOrder, 'customFields'>, Record<string, string>];
  EmployeeSelector: [CreatePurchaseOrder['employeeAssignments'], CreatePurchaseOrder['employeeAssignments']];
  LocationSelector: [undefined, Location];
  OrderSelector: [undefined, Pick<CreatePurchaseOrder, 'orderName' | 'orderId' | 'customerId' | 'customerName'>];
  ProductConfig: [
    NonNullableValues<Pick<CreatePurchaseOrder, 'locationName' | 'locationId'>> & { product: Product },
    Product,
  ];
  ProductCreator: [
    NonNullableValues<Pick<CreatePurchaseOrder, 'locationId' | 'vendorName'>>,
    CreatePurchaseOrder['products'][number],
  ];
  ProductSelector: [
    NonNullableValues<Pick<CreatePurchaseOrder, 'vendorName' | 'locationName' | 'locationId'>>,
    Product[],
  ];
  StatusSelector: [undefined, Status];
  VendorSelector: [undefined, { vendorName: string; vendorCustomerId: ID | null }];
  WorkOrderSelector: [
    undefined,
    Pick<CreatePurchaseOrder, 'workOrderName' | 'customerId' | 'customerName' | 'orderName' | 'orderId'>,
  ];
};

type NonNullableValues<T> = {
  [K in keyof T]-?: NonNullable<T[K]>;
};
