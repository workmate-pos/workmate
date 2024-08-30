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
import { ControlledSearchBar } from '@teifi-digital/pos-tools/components/ControlledSearchBar.js';
import { FormButton } from '@teifi-digital/pos-tools/form/components/FormButton.js';

export type ListPopupItem<ID extends string = string> = Omit<ListRow, 'id' | 'onPress' | 'rightSide'> & {
  id: ID;
  disabled?: boolean;
};

type BaseListPopupAction<ID extends string = string> = {
  title?: string;
  type?: ButtonType;
  onAction: (ids: ID[]) => void;
  disabled?: boolean;
  loading?: boolean;
  position?: 'top' | 'bottom';
  submit?: boolean;
};

export type SelectListPopupAction<ID extends string = string> = BaseListPopupAction<ID> & { onAction: () => void };
export type MultiSelectListPopupAction<ID extends string = string> = BaseListPopupAction<ID> & {
  onAction: (ids: ID[]) => void;
};

export type ListPopupProps<ID extends string = string> = {
  title: string;
  /**
   * Query value and setter. If provided, a search bar will be shown.
   */
  query?: {
    query: string;
    setQuery: (query: string) => void;
  };
  selection:
    | {
        type: 'select';
        items: ListPopupItem<ID>[];
        onSelect: (id: ID) => void;
        onClose?: () => void;
        actions?: SelectListPopupAction<ID>[];
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
        actions?: MultiSelectListPopupAction<ID>[];
      };
  onEndReached?: () => void;
  isLoadingMore?: boolean;
  emptyState?: ReactNode;
  imageDisplayStrategy?: ListProps['imageDisplayStrategy'];
  useRouter: UseRouter;
  children?: ReactNode;
};

// TODO: Get rid of the <ScrollView> and add it inside the createRouter component only

/**
 * Similar to dropdown, but shows a list of items instead of a dropdown.
 * Can be used to select from many items or from just one.
 * @TODO: Use this from pos-tools once WorkMate migrates to new POS SDK
 * @TODO: Create wrappers: StaticListPopup and QueryListPopup, where latter takes a query and render fn
 */
export function ListPopup<ID extends string = string>({
  title,
  selection,
  emptyState,
  imageDisplayStrategy,
  query,
  isLoadingMore,
  onEndReached,
  useRouter,
  children,
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

  const defaultActionPosition = 'bottom';
  const bottomActions = selection.actions?.filter(action => (action.position ?? defaultActionPosition) === 'bottom');
  const topActions = selection.actions?.filter(action => (action.position ?? defaultActionPosition) === 'top');

  return (
    <ScrollView>
      <Stack direction={'vertical'} spacing={2}>
        {topActions?.map(action => getActionButton(action, selectedIds))}

        {!!query && (
          <ControlledSearchBar
            value={query.query}
            onTextChange={query.setQuery}
            onSearch={() => {}}
            placeholder={'Search'}
            onFocus={() => {}}
            editable
          />
        )}

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
          onEndReached={onEndReached}
          isLoadingMore={isLoadingMore}
        />

        {selection.items.length === 0 &&
          !isLoadingMore &&
          (emptyState ?? (
            <Stack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
              <Text color="TextSubdued" variant="body">
                No items found
              </Text>
            </Stack>
          ))}

        {isLoadingMore && (
          <Stack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
            <Text color="TextSubdued" variant="body">
              Loading...
            </Text>
          </Stack>
        )}

        {children}

        {bottomActions?.map(action => getActionButton(action, selectedIds))}
      </Stack>
    </ScrollView>
  );
}

function getActionButton<ID extends string = string>(
  action: SelectListPopupAction<ID> | MultiSelectListPopupAction<ID>,
  selectedIds: ID[],
) {
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
