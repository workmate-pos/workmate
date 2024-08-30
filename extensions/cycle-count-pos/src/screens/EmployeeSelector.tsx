import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { useDebouncedState } from '@work-orders/common-pos/hooks/use-debounced-state.js';
import { useEmployeesQuery } from '@work-orders/common/queries/use-employees-query.js';
import { ListPopup, ListPopupItem, ListPopupProps } from '@work-orders/common-pos/screens/ListPopup.js';
import { DiscriminatedUnionOmit } from '@work-orders/common/types/DiscriminatedUnionOmit.js';
import { useRouter } from '../routes.js';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { Stack, Text } from '@shopify/retail-ui-extensions-react';

export function EmployeeSelector({
  selection,
  onClear,
}: {
  selection: DiscriminatedUnionOmit<ListPopupProps<ID>['selection'], 'items'>;
  onClear?: () => void;
}) {
  const [query, setQuery] = useDebouncedState('');

  const fetch = useAuthenticatedFetch();
  const employeesQuery = useEmployeesQuery({ fetch, params: { query } });

  const employees = employeesQuery.data?.pages.flat() ?? [];
  const items = employees.map<ListPopupItem<ID>>(employee => ({
    id: employee.id,
    leftSide: {
      label: employee.name,
    },
  }));

  const router = useRouter();

  const actions: ListPopupProps['actions'] = onClear
    ? [
        {
          title: 'Clear',
          type: 'plain',
          onAction: () => {
            onClear();
            router.popCurrent();
          },
        },
      ]
    : [];

  const title = selection.type === 'select' ? 'Select Employees' : 'Create Employees';

  return (
    <ListPopup
      title={title}
      query={{ query, setQuery }}
      selection={{
        ...selection,
        items,
      }}
      isLoadingMore={employeesQuery.isFetching}
      onEndReached={() => employeesQuery.fetchNextPage()}
      useRouter={useRouter}
      emptyState={
        <Stack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
          <Text color="TextSubdued" variant="body">
            No employees found
          </Text>
        </Stack>
      }
      actions={actions}
    />
  );
}
