import {
  Button,
  ButtonType,
  List,
  ListProps,
  ListRow,
  ScrollView,
  Stack,
  Text,
} from '@shopify/retail-ui-extensions-react';
import { ReactNode, useEffect, useState } from 'react';
import { useScreen } from '@teifi-digital/pos-tools/router';
import { UseRouter } from './router.js';

export type ListPopupItem<ID extends string = string> = Omit<ListRow, 'id' | 'onPress' | 'rightSide'> & {
  id: ID;
  disabled?: boolean;
};

export type ListPopupProps<ID extends string = string> = {
  title: string;
  selection:
    | {
        type: 'select';
        items: ListPopupItem<ID>[];
        onSelect: (id: ID) => void;
        onClose?: () => void;
      }
    | {
        type: 'multi-select';
        items: ListPopupItem<ID>[];
        initialSelection?: ID[];
        /**
         * Called the moment a selection is made.
         */
        onSelect?: (ids: ID[]) => void;
        /**
         * Called when the page is closed.
         */
        onClose?: (ids: ID[]) => void;
      };
  actions?: {
    title: string;
    type?: ButtonType;
    onAction: (ids: ID[]) => void;
  }[];
  emptyState?: ReactNode;
  imageDisplayStrategy?: ListProps['imageDisplayStrategy'];
  useRouter: UseRouter;
};

/**
 * Similar to dropdown, but shows a list of items instead of a dropdown.
 * Can be used to select from many items or from just one.
 * @TODO: Use this from pos-tools once WorkMate migrates to new POS SDK
 */
export function ListPopup<ID extends string = string>({
  title,
  selection,
  emptyState,
  imageDisplayStrategy,
  actions,
  useRouter,
}: ListPopupProps<ID>) {
  const router = useRouter();
  const screen = useScreen();
  screen.setTitle(title);

  const [selectedIds, setSelectedIds] = useState<ID[]>(
    selection.type === 'multi-select' ? selection.initialSelection ?? [] : [],
  );

  useEffect(() => {
    screen.addOnNavigateBack(() => {
      if (selection.type === 'select') {
        selection.onClose?.();
      } else if (selection.type === 'multi-select') {
        selection.onClose?.(selectedIds);
      } else {
        return selection satisfies never;
      }
    });
  }, [selectedIds]);

  return (
    <ScrollView>
      <Stack direction={'vertical'} spacing={2}>
        <List
          imageDisplayStrategy={imageDisplayStrategy}
          data={selection.items.map<ListRow>(item => ({
            id: item.id,
            leftSide: item.leftSide,
            rightSide: {
              showChevron: selection.type === 'select' && !item.disabled,
              toggleSwitch:
                selection.type !== 'multi-select'
                  ? undefined
                  : { value: selectedIds.includes(item.id), disabled: item.disabled },
            },
            onPress: async () => {
              if (item.disabled) {
                return;
              }

              if (selection.type === 'select') {
                await router.popCurrent();
                selection.onSelect(item.id);
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

        {selection.items.length === 0 &&
          (emptyState ?? (
            <Stack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
              <Text color="TextCritical" variant="body">
                No items found
              </Text>
            </Stack>
          ))}

        {actions?.map(({ title, type, onAction }) => (
          <Button title={title} type={type} onPress={() => onAction(selectedIds)} />
        ))}
      </Stack>
    </ScrollView>
  );
}
