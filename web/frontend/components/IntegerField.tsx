import { TextField, TextFieldProps } from '@shopify/polaris';
import { useEffect, useState } from 'react';

export function IntegerField({ id, onChange, value, min, max, ...props }: Omit<TextFieldProps, 'type'>) {
  const [internalValue, setInternalValue] = useState(value ?? '');

  useEffect(() => {
    if (value !== undefined) {
      setInternalValue(value);
    }
  }, [value]);

  return (
    <TextField
      {...props}
      id={id}
      type={'integer'}
      min={min}
      max={max}
      onChange={value => setInternalValue(value)}
      value={internalValue}
      onBlur={() => {
        if (onChange === undefined) return;

        if (internalValue === '') {
          onChange(internalValue, id ?? '');
          setInternalValue(value ?? '');
          return;
        }

        const num = Number(internalValue);

        if (Number.isNaN(num)) {
          const val = String(min ?? max ?? 0);
          onChange(val, id ?? '');
          setInternalValue(val);
          return;
        }

        if (max !== undefined && num > Number(max)) {
          const val = String(max);
          onChange(val, id ?? '');
          setInternalValue(val);
          return;
        }

        if (min !== undefined && num < Number(min)) {
          const val = String(min);
          onChange(val, id ?? '');
          setInternalValue(val);
          return;
        }

        onChange(String(num), id ?? '');
      }}
    />
  );
}
