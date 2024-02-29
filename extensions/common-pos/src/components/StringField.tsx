import { useEffect, useState } from 'react';
import { TextField } from '@shopify/retail-ui-extensions-react';
import { useFormContext } from '@work-orders/common-pos/hooks/use-form.js';

/**
 * @TODO: Repalce with NewStringField
 */
export function StringField({
  label,
  value,
  onChange,
  onIsValid,
  disabled,
  validate = () => null,
  required,
}: {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  onIsValid?: (isValid: boolean) => void;
  disabled?: boolean;
  validate?: (value: string) => string | null;
  required?: boolean;
}) {
  const [internalState, setInternalState] = useState(value);
  const [error, setError] = useState('');
  const formContext = useFormContext(label);

  useEffect(() => {
    change(value);
    commit(value);
  }, [value]);

  useEffect(() => {
    change(value ?? '');
    commit(value ?? '');
    setError('');
  }, [label]);

  const change = (value: string) => {
    setError('');
    setInternalState(value);
  };

  const clearError = () => setError('');

  const commit = (newValue: string) => {
    const error = validate(newValue);

    if (error) {
      setError(error);
      formContext?.setIsValid(false);
      onIsValid?.(false);
      return;
    }

    setInternalState(newValue);
    formContext?.setIsValid(true);
    onIsValid?.(true);
    if (value !== newValue) onChange?.(newValue);
  };

  return (
    <TextField
      label={label}
      disabled={disabled || !!formContext?.disabled}
      onChange={change}
      value={internalState}
      error={error}
      onFocus={clearError}
      onBlur={() => commit(internalState)}
      required={required}
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
