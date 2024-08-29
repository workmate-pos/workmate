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
import { useRouter } from '../../routes.js';
import { useScreen } from '@teifi-digital/pos-tools/router';
import { ControlledSearchBar } from '@teifi-digital/pos-tools/components/ControlledSearchBar.js';
import { isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { FormButton } from '@teifi-digital/pos-tools/form/components/FormButton.js';

export type ListPopupItem<ID extends string = string> = Omit<ListRow, 'id' | 'onPress' | 'rightSide'> & {
  id: ID;
  disabled?: boolean;
};

// TODO: Support actions for 'select' too
export type ListPopupAction<ID extends string = string> = {
  title?: string;
  type?: ButtonType;
  onAction: (ids: ID[]) => void;
  disabled?: boolean;
  loading?: boolean;
  position?: 'top' | 'bottom';
  submit?: boolean;
};

export type ListPopupProps<ID extends string = string> = {
  title: string;
  noSearchBar?: boolean;
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
  actions?: ListPopupAction<ID>[];
  emptyState?: ReactNode;
  imageDisplayStrategy?: ListProps['imageDisplayStrategy'];
  children?: ReactNode;
};

/**
 * Similar to dropdown, but shows a list of items instead of a dropdown.
 * Can be used to select from many items or from just one.
 */
export function ListPopup<ID extends string = string>({
  title,
  selection,
  emptyState,
  imageDisplayStrategy,
  actions,
  noSearchBar = false,
  children,
}: ListPopupProps<ID>) {
  const router = useRouter();
  const screen = useScreen();
  screen.setTitle(title);

  const [selectedIds, setSelectedIds] = useState<ID[]>(
    selection.type === 'multi-select' ? selection.initialSelection ?? [] : [],
  );

  const [query, setQuery] = useState('');

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

  const defaultActionPosition = 'bottom';

  const bottomActions = actions?.filter(action => (action.position ?? defaultActionPosition) === 'bottom');
  const topActions = actions?.filter(action => (action.position ?? defaultActionPosition) === 'top');

  return (
    <ScrollView>
      <Stack direction={'vertical'} spacing={2}>
        {topActions?.map(action => getActionButton(action, selectedIds))}

        {!noSearchBar && (
          <ControlledSearchBar
            value={query}
            onTextChange={setQuery}
            onSearch={() => {}}
            placeholder={'Search'}
            editable
          />
        )}

        <List
          imageDisplayStrategy={imageDisplayStrategy}
          data={selection.items
            .filter(
              item =>
                !query ||
                item.leftSide.label.toLowerCase().includes(query.toLowerCase()) ||
                item.leftSide.subtitle?.filter(isNonNullable).some(subtitle => {
                  const subtitleString = typeof subtitle === 'string' ? subtitle : subtitle.content;
                  return subtitleString.toLowerCase().includes(query.toLowerCase());
                }),
            )
            .map<ListRow>(item => ({
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
              <Text color="TextSubdued" variant="body">
                No items found
              </Text>
            </Stack>
          ))}

        {children}

        {bottomActions?.map(action => getActionButton(action, selectedIds))}
      </Stack>
    </ScrollView>
  );
}

function getActionButton<ID extends string = string>(action: ListPopupAction<ID>, selectedIds: ID[]) {
  return (
    <FormButton
      title={action.title ?? ''}
      type={action.type}
      action={action.submit ? 'submit' : 'button'}
      disabled={action.disabled}
      loading={action.loading}
      onPress={() => action.onAction(selectedIds)}
    />
  );
}
