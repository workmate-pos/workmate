import { TextField, TextFieldProps } from '@shopify/polaris';
import { useState } from 'react';

/**
 * Number field that formats the value when unfocused.
 * Maintains its own internal state, but notifies the parent of changes through {@link TextFieldProps.onChange}.
 * Synchronizes with {@link TextFieldProps.value} when the field is unfocused.
 */
export function NumberField({ decimals, value, onBlur, onChange, ...rest }: TextFieldProps & { decimals: number }) {
  const format = (value?: string) => {
    if (value === undefined) return undefined;
    return Number(value).toFixed(decimals);
  };

  const [internalValue, setInternalValue] = useState(format(value));

  return (
    <TextField
      {...rest}
      value={internalValue}
      onBlur={() => {
        setInternalValue(format(value));
        onBlur?.();
      }}
      onChange={(value, id) => {
        setInternalValue(value);
        onChange?.(value, id);
      }}
    />
  );
}
