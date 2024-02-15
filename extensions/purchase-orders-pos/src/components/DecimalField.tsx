import { useEffect, useState } from 'react';
import { TextField } from '@shopify/retail-ui-extensions-react';
import { BigDecimal, Decimal, RoundingMode } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { useFormContext } from '@work-orders/common-pos/hooks/use-form.js';

export type DecimalFieldProps = Parameters<typeof DecimalField>[0];

type Value<AllowsEmpty extends boolean> = AllowsEmpty extends false ? Decimal : Decimal | null;

/**
 * Decimal field with validation and errors, and automatic rounding;
 */
export function DecimalField<const AllowEmpty extends boolean>({
  label,
  value,
  onChange,
  onIsValid,
  disabled,
  decimals,
  roundingMode,
  allowEmpty,
}: {
  label: string;
  value: Value<AllowEmpty>;
  onChange?: (value: Value<AllowEmpty>) => void;
  onIsValid?: (isValid: boolean) => void;
  disabled?: boolean;
  decimals: number;
  roundingMode: RoundingMode;
  allowEmpty: AllowEmpty;
}) {
  const [internalState, setInternalState] = useState(value ?? '');
  const [error, setError] = useState('');
  const formContext = useFormContext();

  useEffect(() => {
    change(value ?? '');
  }, [value]);

  useEffect(() => {
    return () => formContext?.clearValidity(label);
  }, [label]);

  const change = (value: string) => {
    setInternalState(value);
    const isValid = isValidNumber(value, allowEmpty);
    onIsValid?.(isValid);
    formContext?.setValidity(label, isValid);
  };

  const clearError = () => setError('');

  const commit = () => {
    if (!isValidNumber(internalState, allowEmpty)) {
      setError('Invalid amount');
      return;
    }

    const parsedValue = parseNumberInput(internalState, decimals, roundingMode, allowEmpty, value);

    setInternalState(parsedValue ?? '');
    onChange?.(parsedValue);
  };

  return (
    <TextField
      label={label}
      disabled={disabled || !!formContext?.disabled}
      onChange={change}
      value={internalState}
      error={error}
      onFocus={clearError}
      onBlur={commit}
    />
  );
}

function parseNumberInput<const AllowEmpty extends boolean>(
  value: string,
  decimals: number,
  roundingMode: RoundingMode,
  allowEmpty: AllowEmpty,
  fallback: Value<AllowEmpty>,
): Value<AllowEmpty> {
  if (allowEmpty && !value.trim()) {
    return null as Value<AllowEmpty>;
  }

  if (BigDecimal.isValid(value)) {
    return BigDecimal.fromString(value).round(decimals, roundingMode).toDecimal();
  }

  return fallback;
}

function isValidNumber(value: string, allowsEmpty: boolean) {
  if (allowsEmpty && !value.trim()) {
    return true;
  }

  return BigDecimal.isValid(value);
}
