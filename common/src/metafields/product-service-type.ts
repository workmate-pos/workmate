// IMPORTANT: Do not change these constants!
// Changing them requires a migration/backwards compatibility in parse.

export const QUANTITY_ADJUSTING_SERVICE = 'Quantity-Adjusting Service';
export const FIXED_PRICE_SERVICE = 'Fixed-Price Service';

export const AVAILABLE_PRODUCT_SERVICE_TYPES = [QUANTITY_ADJUSTING_SERVICE, FIXED_PRICE_SERVICE] as const;
export type ProductServiceType = (typeof AVAILABLE_PRODUCT_SERVICE_TYPES)[number];

export const SERVICE_METAFIELD_VALUE_TAG_NAME = {
  [QUANTITY_ADJUSTING_SERVICE]: 'WorkMate Quantity-Adjusting Service',
  [FIXED_PRICE_SERVICE]: 'WorkMate Fixed-Price Service',
} as const;

export function getProductServiceType(value: string | null | undefined): ProductServiceType | null {
  if (!AVAILABLE_PRODUCT_SERVICE_TYPES.some(el => el === value)) {
    return null;
  }

  return value as ProductServiceType;
}

export function parseProductServiceType(value: string): ProductServiceType {
  const productServiceType = getProductServiceType(value);

  if (!productServiceType) {
    throw new Error(
      `Invalid service type value '${value}' - must be one of [${AVAILABLE_PRODUCT_SERVICE_TYPES.join(', ')}]`,
    );
  }

  return productServiceType;
}
