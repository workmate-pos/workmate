import { List, Stack, Text } from '@shopify/retail-ui-extensions-react';
import { useCurrencyFormatter } from '../hooks/use-currency-formatter.js';
import { CreateWorkOrderEmployeeAssignment } from '../screens/routes.js';
import { useEmployeeQueries } from '@work-orders/common/queries/use-employee-query.js';
import { useAuthenticatedFetch } from '../hooks/use-authenticated-fetch.js';
import { Cents, toDollars } from '@work-orders/common/util/money.js';

/**
 * A list of clickable EmployeeAssignments.
 */
export function EmployeeAssignmentList({
  employeeAssignments,
  onClick,
  readonly = false,
}: {
  readonly?: boolean;
  employeeAssignments: Omit<CreateWorkOrderEmployeeAssignment, 'lineItemUuid'>[];
  onClick: (employeeAssignment: Omit<CreateWorkOrderEmployeeAssignment, 'lineItemUuid'>) => void;
}) {
  const currencyFormatter = useCurrencyFormatter();

  const fetch = useAuthenticatedFetch();
  const employeeQueries = useEmployeeQueries({ fetch, ids: employeeAssignments.map(e => e.employeeId) });

  if (employeeAssignments.length === 0) {
    return (
      <Stack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
        <Text variant="body" color="TextSubdued">
          No employees assigned
        </Text>
      </Stack>
    );
  }

  return (
    <List
      data={employeeAssignments.map(assignment => {
        const { employeeId, hours } = assignment;
        const query = employeeQueries[employeeId];
        const rate: Cents = query?.data?.rate ?? (0 as Cents);
        const name = query?.isLoading ? 'Loading...' : query?.data?.name ?? 'Unknown employee';

        return {
          id: employeeId,
          onPress: readonly
            ? undefined
            : () => {
                onClick(assignment);
              },
          leftSide: {
            label: name,
            subtitle: [`${hours} hours`, `${currencyFormatter(toDollars(rate))}/hour`],
          },
          rightSide: {
            showChevron: !readonly,
            label: currencyFormatter(toDollars((hours * rate) as Cents)),
          },
        };
      })}
    />
  );
}
