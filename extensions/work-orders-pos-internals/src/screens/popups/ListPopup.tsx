import { Button, List, ListRow, ScrollView } from '@shopify/retail-ui-extensions-react';
import { useEffect, useState } from 'react';
import { useRouter } from '../../routes.js';
import { useScreen } from '@teifi-digital/pos-tools/router';

export type ListPopupItem = Omit<ListRow, 'onPress' | 'rightSide'> & { disabled?: boolean };

export type ListPopupProps = {
  title: string;
  selection:
    | {
        type: 'select';
        items: ListPopupItem[];
        onSelect: (item: string) => void;
      }
    | {
        type: 'multi-select';
        items: ListPopupItem[];
        initialSelection?: string[];
        /**
         * Called the moment a selection is made.
         */
        onSelect?: (items: string[]) => void;
        /**
         * Called when the page is closed.
         */
        onClose?: (items: string[]) => void;
        actions?: {
          save?: {
            /**
             * Title of the save button. Defaults to 'Save'.
             */
            title?: string;
            onSave: (items: string[]) => void;
          };
        };
      };
};

/**
 * Similar to dropdown, but shows a list of items instead of a dropdown.
 * Can be used to select from many items or from just one.
 */
export function ListPopup({ title, selection }: ListPopupProps) {
  const router = useRouter();
  const screen = useScreen();
  screen.setTitle(title);

  const [selectedIds, setSelectedIds] = useState<string[]>(
    selection.type === 'multi-select' ? selection.initialSelection ?? [] : [],
  );

  useEffect(() => {
    screen.addOnNavigateBack(() => {
      if (selection.type === 'multi-select') {
        selection.onClose?.(selectedIds);
      }
    });
  }, [selectedIds]);

  return (
    <ScrollView>
      <List
        data={selection.items.map<ListRow>(item => ({
          id: item.id,
          leftSide: item.leftSide,
          rightSide: {
            showChevron: selection.type === 'select',
            toggleSwitch:
              selection.type !== 'multi-select'
                ? undefined
                : { value: selectedIds.includes(item.id), disabled: item.disabled },
          },
          onPress: () => {
            if (item.disabled) {
              return;
            }

            if (selection.type === 'select') {
              selection.onSelect(item.id);
              router.popCurrent();
            } else if (selection.type === 'multi-select') {
              const newSelectedIds = selectedIds.includes(item.id)
                ? selectedIds.filter(id => id !== item.id)
                : [...selectedIds, item.id];

              setSelectedIds(newSelectedIds);
              selection.onSelect?.(newSelectedIds);
            } else {
              return selection satisfies never;
            }
          },
        }))}
        onEndReached={() => {}}
        isLoadingMore={false}
      />
      {selection.type === 'multi-select' && selection.actions?.save && (
        <Button
          title={selection.actions.save.title ?? 'Save'}
          onPress={() => {
            selection.actions?.save?.onSave(selectedIds);
            router.popCurrent();
          }}
        />
      )}
    </ScrollView>
  );
}
