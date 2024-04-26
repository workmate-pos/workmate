/**
 * Tags applied to products that are service products.
 * This tag is used to load only service/non-service products in product lists on POS.
 * It is automatically added/removed to products depending on the value of the "Service Type" metafield.
 *
 * We have two types of service products:
 * - Mutable service products - these absorb charges by increasing the quantity of the service product (price should be $1.00)
 * - Fixed price service products - these work like normal products, but are in the Services list.
 *
 * @todo: use these + metafields instead of collections
 */
export const SERVICE_PRODUCT_TAG = {
  MUTABLE: 'WorkMate Quantity-Adjusting Service',
  FIXED_PRICE: 'WorkMate Fixed Price Service',
} as const;
