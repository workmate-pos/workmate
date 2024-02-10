import type { Status, Product } from '@web/schemas/generated/create-purchase-order.js';
import type { Location } from '@work-orders/common/queries/use-locations-query.js';

export type ScreenInputOutput = {
  Entry: [undefined, undefined];

  LocationSelector: [undefined, Location];
  ProductConfig: [Product, Product];
  ProductSelector: [undefined, Product[]];
  StatusSelector: [undefined, Status];
};
