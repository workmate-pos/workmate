import { useScreen } from '@teifi-digital/pos-tools/router';
import { UseRouter } from './router.js';
import { Button, ScrollView, Stack, Text } from '@shopify/retail-ui-extensions-react';
import { ControlledSearchBar } from '@teifi-digital/pos-tools/components/ControlledSearchBar.js';
import { useState } from 'react';
import { ResponsiveGrid } from '@teifi-digital/pos-tools/components/ResponsiveGrid.js';

export type DropdownProps<T extends string> = {
  title: string;
  options: readonly T[] | readonly { id: T; label: string }[];
  onSelect: (option: T) => void;
  disabled?: boolean;
  useRouter: UseRouter;
};

export function Dropdown<const T extends string>({
  title,
  options,
  onSelect,
  disabled = false,
  useRouter,
}: DropdownProps<T>) {
  const router = useRouter();
  const screen = useScreen();

  screen.setTitle(title);

  const shouldPresentSearchBar = options.length >= 10;
  const [query, setQuery] = useState('');

  return (
    <ScrollView>
      {options.length === 0 && (
        <Stack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
          <Text color="TextCritical" variant="body">
            No options available
          </Text>
        </Stack>
      )}

      <ResponsiveGrid columns={1} spacing={2}>
        {shouldPresentSearchBar && (
          <ControlledSearchBar
            value={query}
            onTextChange={setQuery}
            placeholder={'Search options'}
            onSearch={() => {}}
          />
        )}

        {options
          .filter(option => {
            const label: string =
              typeof option === 'object' && 'id' in option && 'label' in option ? option.label : option;
            return !query || label.toLowerCase().includes(query.toLowerCase());
          })
          .map(option => {
            const { id, label } =
              typeof option === 'object' && 'id' in option && 'label' in option
                ? option
                : { id: option, label: option };

            return (
              <Button
                key={id}
                title={label}
                onPress={() => {
                  onSelect(id);
                  router.popCurrent();
                }}
                isDisabled={disabled}
              />
            );
          })}
      </ResponsiveGrid>
    </ScrollView>
  );
}
