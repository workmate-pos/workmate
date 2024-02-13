import { useEffect, useState } from 'react';
import { TextField } from '@shopify/retail-ui-extensions-react';

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

  useEffect(() => {
    change(value);
  }, [value]);

  const change = (value: string) => {
    setInternalState(value);
    const error = validate(value);
    onIsValid?.(error === null);
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
      disabled={disabled}
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
