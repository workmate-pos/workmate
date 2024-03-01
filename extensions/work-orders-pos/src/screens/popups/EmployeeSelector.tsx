import { List, ListRow, ScrollView, Stack, Text } from '@shopify/retail-ui-extensions-react';
import { useState } from 'react';
import { Employee, useEmployeesQuery } from '@work-orders/common/queries/use-employees-query.js';
import { useDebouncedState } from '@work-orders/common/hooks/use-debounced-state.js';
import { useScreen } from '../../hooks/use-screen.js';
import { ID } from '@web/schemas/generated/ids.js';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { ControlledSearchBar } from '@teifi-digital/pos-tools/components/ControlledSearchBar.js';
import { extractErrorMessage } from '@teifi-digital/pos-tools/utils/errors.js';

export function EmployeeSelector() {
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<ID[]>([]);
  const [query, setQuery] = useDebouncedState('');

  const { Screen, closePopup } = useScreen('EmployeeSelector', ids => {
    setSelectedEmployeeIds(ids);
    setQuery('', true);
  });

  const fetch = useAuthenticatedFetch();
  const employeesQuery = useEmployeesQuery({ fetch, params: { query } });
  const employees = employeesQuery.data?.pages ?? [];

  const rows = getEmployeeRows(employees, selectedEmployeeIds, setSelectedEmployeeIds);

  const close = () => {
    const selected = employees.filter(e => selectedEmployeeIds.includes(e.id)).map(e => e.id);

    closePopup(selected);
  };

  return (
    <Screen title="Select employee" presentation={{ sheet: true }} overrideNavigateBack={close}>
      <ScrollView>
        <Stack direction="horizontal" alignment="center" flex={1} paddingHorizontal={'HalfPoint'}>
          <Text variant="body" color="TextSubdued">
            {employeesQuery.isRefetching ? 'Reloading...' : ' '}
          </Text>
        </Stack>
        <ControlledSearchBar
          value={query}
          onTextChange={(query: string) => {
            setQuery(query, query === '');
          }}
          onSearch={() => {}}
          placeholder="Search employees"
        />
        <List
          data={rows}
          isLoadingMore={employeesQuery.isLoading}
          onEndReached={() => employeesQuery.fetchNextPage()}
        />
        {employeesQuery.isLoading && (
          <Stack direction="horizontal" alignment="center" flex={1} paddingVertical="ExtraLarge">
            <Text variant="body" color="TextSubdued">
              Loading employees...
            </Text>
          </Stack>
        )}
        {employeesQuery.isSuccess && rows.length === 0 && (
          <Stack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
            <Text variant="body" color="TextSubdued">
              No employees found
            </Text>
          </Stack>
        )}
        {employeesQuery.isError && (
          <Stack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
            <Text color="TextCritical" variant="body">
              {extractErrorMessage(employeesQuery.error, 'Error loading employees')}
            </Text>
          </Stack>
        )}
      </ScrollView>
    </Screen>
  );
}

function getEmployeeRows(employees: Employee[], selectedEmployeeIds: ID[], setSelectedEmployees: (ids: ID[]) => void) {
  return employees.map<ListRow>(({ id, name }) => ({
    id,
    onPress: () => {
      const selected = selectedEmployeeIds.includes(id);
      if (selected) {
        setSelectedEmployees(selectedEmployeeIds.filter(e => e !== id));
      } else {
        setSelectedEmployees([...selectedEmployeeIds, id]);
      }
    },
    leftSide: {
      label: name,
      badges: [
        // TODO: add badges
        // {
        //   text: `${assignments} assignments`,
        //   variant:
        //     assignments > 7 ? 'critical' : assignments > 3 ? 'warning' : assignments === 0 ? 'success' : 'neutral',
        //   status: assignments === 0 ? 'empty' : assignments === 10 ? 'complete' : 'partial',
        // },
      ],
    },
    rightSide: {
      toggleSwitch: {
        value: selectedEmployeeIds.includes(id),
      },
    },
  }));
}
