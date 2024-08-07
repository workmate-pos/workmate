import type { PaymentTermsType } from '@web/services/gql/queries/generated/schema.js';

export const paymentTermTypes = [
  'RECEIPT',
  'NET',
  'FIXED',
  'FULFILLMENT',
] as const satisfies readonly PaymentTermsType[];

export function isPaymentTermType(type: string): type is PaymentTermsType {
  return (paymentTermTypes as readonly string[]).includes(type);
}
