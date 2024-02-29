import { InputAction } from '@shopify/retail-ui-extensions';
import { TextField } from '@shopify/retail-ui-extensions-react';
import { useCallback, useEffect, useState } from 'react';
import { useFormContext } from '../hooks/use-form.js';

export type NewStringFieldProps = {
  value: string;
  onChange?: (value: string) => void;
  onIsValid?: (isValid: boolean) => void;
  preprocessor?: (value: string) => string;
  validator?: (value: string) => string | null;
  postprocessor?: (value: string) => string;
  formatter?: (value: string) => string;
  required?: boolean;
  onBlur?: () => void;
  onFocus?: () => void;
  // pass-through props
  label: string;
  disabled?: boolean;
  placeholder?: string;
  helpText?: string;
  action?: InputAction;
};

export function NewStringField({
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
}: NewStringFieldProps) {
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
      if (required && value.trim().length === 0) {
        setError('This field is required');
        setIsValid(false);
        return;
      }

      const preprocessedValue = preprocessor ? preprocessor(value) : value;

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
    <TextField
      label={label}
      value={displayValue}
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
