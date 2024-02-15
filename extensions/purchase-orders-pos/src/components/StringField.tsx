import { useEffect, useState } from 'react';
import { TextField } from '@shopify/retail-ui-extensions-react';
import { useFormContext } from '@work-orders/common-pos/hooks/use-form.js';

/**
 * Decimal field with validation and errors, and automatic rounding;
 */
export function StringField({
  label,
  value,
  onChange,
  onIsValid,
  disabled,
  validate = () => null,
}: {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  onIsValid?: (isValid: boolean) => void;
  disabled?: boolean;
  validate?: (value: string) => string | null;
}) {
  const [internalState, setInternalState] = useState(value);
  const [error, setError] = useState('');
  const formContext = useFormContext();

  useEffect(() => {
    change(value);
  }, [value]);

  useEffect(() => {
    return () => formContext?.clearValidity(label);
  }, [label]);

  const change = (value: string) => {
    setInternalState(value);
    const error = validate(value);
    const isValid = error === null;
    onIsValid?.(isValid);
    formContext?.setValidity(label, isValid);
  };

  const clearError = () => setError('');

  const commit = () => {
    const error = validate(internalState);

    if (error) {
      setError(error);
      return;
    }

    onChange?.(internalState);
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

export function stringLengthValidator({ min, max }: { min?: number; max?: number }) {
  return (str: string) => {
    if (min && str.length < min) return `Must be at least ${min} characters`;
    if (max && str.length > max) return `Must be at most ${max} characters`;

    return null;
  };
}
