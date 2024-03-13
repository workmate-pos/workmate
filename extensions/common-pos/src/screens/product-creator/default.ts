import { CreateProduct, Int } from '@web/schemas/generated/create-product.js';
import { BigDecimal } from '@teifi-digital/shopify-app-toolbox/big-decimal';

export const defaultCreateProduct: CreateProduct = {
  title: '',
  availableQuantity: 0 as Int,
  sku: null,
  barcode: null,
  allowOutOfStockPurchases: true,
  productType: null,
  price: BigDecimal.ONE.round(2).toMoney(),
  options: [],
  costPrice: null,
  vendor: null,
  locationId: null,
};
