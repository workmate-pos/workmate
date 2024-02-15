import { SearchBar, SearchBarProps } from '@shopify/retail-ui-extensions-react';
import { useEffect, useState } from 'react';

/**
 * Semi-Controlled version of SearchBar.
 * SearchBar allows setting an initialValue, but this is useless after the user starts typing.
 * This component wraps SearchBar and allows setting the value externally.
 *
 * The SearchBar is re-rendered whenever the value is changed to something different from the current value.
 * (re-rendering on every value change would collapse the keyword while typing)
 */
export function ControlledSearchBar({
  value,
  onTextChange,
  ...props
}: Omit<SearchBarProps, 'initialValue'> & { value?: string }) {
  const [internalValue, setInternalValue] = useState(value);
  const [internalKey, setInternalKey] = useState(0);

  useEffect(() => {
    setInternalValue(value);

    if (value !== internalValue) {
      setInternalKey(key => 1 - key);
    }
  }, [value]);

  return (
    <SearchBar
      key={internalKey}
      initialValue={internalValue}
      onTextChange={(value: string) => {
        setInternalValue(value);
        onTextChange?.(value);
      }}
      {...props}
    />
  );
}
