import type { Status, Product } from '@web/schemas/generated/create-purchase-order.js';
import type { Location } from '@work-orders/common/queries/use-locations-query.js';
import type { Vendor } from '@work-orders/common/queries/use-vendors-query.js';

export type ScreenInputOutput = {
  Entry: [undefined, undefined];

  LocationSelector: [undefined, Location];
  ProductConfig: [Product, Product];
  ProductSelector: [undefined, Product[]];
  StatusSelector: [undefined, Status];
  VendorSelector: [undefined, Vendor];
};
