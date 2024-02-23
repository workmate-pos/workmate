import { BigDecimal, RoundingMode } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { Decimal } from '@web/schemas/generated/shop-settings.js';
import { DecimalField, DecimalFieldProps } from './DecimalField.js';
import { Int } from '@web/schemas/generated/create-product.js';

export type IntFieldProps = {
  label: string;
  value: Int | null;
  onChange?: (value: Int | null) => void;
  onIsValid?: (isValid: boolean) => void;
  disabled?: boolean;
};

/**
 * Wrapper around DecimalField that converts from and to Int.
 */
export function IntField({ value, onChange, ...props }: IntFieldProps) {
  const internalValue = value === null ? null : BigDecimal.fromString(String(value)).toDecimal();

  const internalOnChange = (val: Decimal | null) => {
    onChange?.(val === null ? null : (parseInt(val) as Int));
  };

  return DecimalField({
    ...props,
    value: internalValue,
    onChange: internalOnChange,
    decimals: 0,
    roundingMode: RoundingMode.CEILING,
    allowEmpty: false,
  } as DecimalFieldProps);
}
