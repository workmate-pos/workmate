import { TextField, TextFieldProps } from '@shopify/polaris';
import { useEffect, useState } from 'react';

export function DecimalField({
  id,
  onChange,
  value,
  min,
  max,
  decimals = 5,
  ...props
}: Omit<TextFieldProps, 'type'> & { decimals?: number }) {
  const [internalValue, setInternalValue] = useState(value ?? '');
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (value !== undefined) {
      setInternalValue(value);
    }
  }, [value]);

  const displayValue = isFocused ? internalValue : formatDecimal(internalValue);

  function formatDecimal(value: string) {
    if (value === '') return '';

    const num = Number(value);

    if (Number.isNaN(num)) {
      return value;
    }

    return num.toFixed(decimals);
  }

  return (
    <TextField
      {...props}
      id={id}
      type={'number'}
      min={min}
      max={max}
      onChange={value => setInternalValue(value)}
      value={displayValue}
      onFocus={() => setIsFocused(true)}
      onBlur={() => {
        setIsFocused(false);

        if (onChange === undefined) return;

        if (internalValue === '') {
          onChange(internalValue, id ?? '');
          setInternalValue(value ?? '');
          return;
        }

        const num = Number(internalValue);

        if (Number.isNaN(num)) {
          const val = Number(min ?? max ?? 0).toFixed(2);
          onChange(val, id ?? '');
          setInternalValue(val);
          return;
        }

        if (max !== undefined && num > Number(max)) {
          const val = Number(max).toFixed(2);
          onChange(val, id ?? '');
          setInternalValue(val);
          return;
        }

        if (min !== undefined && num < Number(min)) {
          const val = Number(min).toFixed(2);
          onChange(val, id ?? '');
          setInternalValue(val);
          return;
        }

        onChange(num.toFixed(2), id ?? '');
      }}
    />
  );
}
