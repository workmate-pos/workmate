import { Money, RoundingMode } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { DecimalField } from './DecimalField.js';

type Value<AllowsEmpty extends boolean> = AllowsEmpty extends false ? Money : Money | null;

/**
 * The same as DecimalField, but for Money instead of Decimal.
 * Has the same props, but without `decimals` (2) and `roundingMode` (ceiling).
 */
export function MoneyField<const AllowEmpty extends boolean>(props: {
  label: string;
  value: Value<AllowEmpty>;
  onChange?: (value: Value<AllowEmpty>) => void;
  onIsValid?: (isValid: boolean) => void;
  disabled?: boolean;
  allowEmpty: AllowEmpty;
}) {
  return DecimalField<AllowEmpty>({ ...props, decimals: 2, roundingMode: RoundingMode.CEILING } as any);
}
