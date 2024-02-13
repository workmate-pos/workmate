import { CreateProduct, Int } from '@web/schemas/generated/create-product.js';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { BigDecimal } from '@teifi-digital/shopify-app-toolbox/big-decimal';

export type CreateProductBase = {
  locationId: ID;
  vendor: string;
};

export const defaultCreateProduct = (base: CreateProductBase): CreateProduct => ({
  ...base,
  title: '',
  availableQuantity: 0 as Int,
  sku: null,
  barcode: null,
  allowOutOfStockPurchases: true,
  productType: null,
  price: BigDecimal.ONE.round(2).toMoney(),
  options: [],
  costPrice: null,
});
