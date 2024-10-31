import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';

export type ReorderPoint = {
  inventoryItemId: ID;
  locationId: ID | null;
  id: number;
  shop: string;
  min: number;
  max: number;
  createdAt: Date;
  updatedAt: Date;
};

export type ReorderQuantity = {
  quantity: number;
  inventoryItemId: ID;
  vendor: string;
};
