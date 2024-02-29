import { InputAction } from '@shopify/retail-ui-extensions';
import { NumberField } from '@shopify/retail-ui-extensions-react';
import { BigDecimal, Decimal } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { useCallback, useEffect, useState } from 'react';
import { useFormContext } from '../hooks/use-form.js';

export type NewDecimalFieldProps = {
  value: Decimal | null;
  onChange?: (value: Decimal | null) => void;
  onIsValid?: (isValid: boolean) => void;
  preprocessor?: (value: Decimal | null) => Decimal | null;
  validator?: (value: Decimal | null) => string | null;
  postprocessor?: (value: Decimal | null) => Decimal | null;
  formatter?: (value: Decimal | null) => string;
  required?: boolean;
  onBlur?: () => void;
  onFocus?: () => void;
  // pass-through props
  label: string;
  // TODO: Support min and max
  // min?: number;
  // max?: number;
  disabled?: boolean;
  placeholder?: Decimal;
  helpText?: string;
  action?: InputAction;
  inputMode?: 'decimal' | 'numeric';
};

// TODO: Intfield that has inputmode
export function NewDecimalField({
  label,
  value,
  onChange,
  onIsValid,
  disabled,
  placeholder,
  helpText,
  action,
  preprocessor,
  postprocessor,
  required,
  onBlur,
  onFocus,
  formatter,
  validator,
  inputMode,
}: NewDecimalFieldProps) {
  const formContext = useFormContext(label);

  const [internalValue, setInternalValue] = useState<string>(value ?? '');
  const [error, setError] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const internalValueIsValid = internalValue === value;

  const displayValue = !isFocused && internalValueIsValid && formatter ? formatter(value) : internalValue;
  const displayError = isFocused ? '' : error;

  useEffect(() => {
    setInternalValue(value ?? '');
    if (!isFocused) commit(value ?? '');
  }, [value]);

  useEffect(() => {
    setError('');
  }, []);

  const setIsValid = useCallback(
    (isValid: boolean) => {
      formContext?.setIsValid(isValid);
      onIsValid?.(isValid);
    },
    [onIsValid, formContext?.setIsValid],
  );

  const commit = useCallback(
    (value: string) => {
      const valid = isValidValue(value);

      if (!valid) {
        setError('Invalid amount');
        setIsValid(false);
        return;
      }

      const parsedValue = parseValue(value);

      if (required && parsedValue === null) {
        setError('This field is required');
        setIsValid(false);
        return;
      }

      const preprocessedValue = preprocessor ? preprocessor(parsedValue) : parsedValue;

      const validationError = validator ? validator(preprocessedValue) : null;

      if (validationError) {
        setError(validationError);
        setIsValid(false);
        return;
      }

      const postprocessedValue = postprocessor ? postprocessor(preprocessedValue) : preprocessedValue;

      setInternalValue(value);
      setError('');
      setIsValid(true);

      if (postprocessedValue !== value) {
        onChange?.(postprocessedValue);
      }
    },
    [onChange, required, postprocessor, validator],
  );

  const internalOnFocus = useCallback(() => {
    setIsFocused(true);
    onFocus?.();
  }, [onFocus]);

  const internalOnBlur = useCallback(() => {
    setIsFocused(false);
    onBlur?.();
    commit(internalValue);
  }, [onBlur, commit, internalValue]);

  return (
    <NumberField
      label={label}
      value={displayValue}
      inputMode={inputMode}
      disabled={disabled || formContext?.disabled}
      placeholder={placeholder}
      helpText={helpText}
      action={action}
      required={required}
      error={displayError}
      onBlur={internalOnBlur}
      onFocus={internalOnFocus}
      onChange={setInternalValue}
    />
  );
}

function isValidValue(value: string) {
  return value.trim().length === 0 || BigDecimal.isValid(value);
}

function parseValue(value: string) {
  if (value.trim().length === 0) return null;
  return BigDecimal.fromString(value).toDecimal();
}
