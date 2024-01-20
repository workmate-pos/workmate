import { List, ListRowLeftSide, Stack, Text } from '@shopify/retail-ui-extensions-react';
import { useCurrencyFormatter } from '../hooks/use-currency-formatter.js';
import { useAuthenticatedFetch } from '../hooks/use-authenticated-fetch.js';
import { ID } from '@web/schemas/generated/create-work-order.js';
import { DiscriminatedUnionOmit } from '@work-orders/common/types/DiscriminatedUnionOmit.js';
import { useEmployeeQueries } from '@work-orders/common/queries/use-employee-query.js';
import { isNonNullable } from '@work-orders/common/util/guards.js';
import { getLabourPrice } from '../create-work-order/labour.js';
import { CreateWorkOrderLabour } from '../screens/routes.js';

/**
 * A list of clickable EmployeeLabour items.
 */
export function EmployeeLabourList({
  labour,
  onClick,
  readonly = false,
}: {
  readonly?: boolean;
  labour: DiscriminatedUnionOmit<CreateWorkOrderLabour & { employeeId: ID }, 'lineItemUuid'>[];
  onClick: (labour: DiscriminatedUnionOmit<CreateWorkOrderLabour & { employeeId: ID }, 'lineItemUuid'>) => void;
}) {
  const currencyFormatter = useCurrencyFormatter();

  const fetch = useAuthenticatedFetch();
  const employeeQueries = useEmployeeQueries({ fetch, ids: labour.map(e => e.employeeId).filter(isNonNullable) });

  if (labour.length === 0) {
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
      data={labour.map(l => {
        const query = employeeQueries[l.employeeId];

        const price = getLabourPrice([l]);

        const leftSide: ListRowLeftSide =
          l.type === 'hourly-labour'
            ? {
                label: query?.data?.name ?? 'Unknown Employee',
                subtitle: [l.name, `${l.hours} hours × ${currencyFormatter(l.rate)}/hour`],
              }
            : {
                label: query?.data?.name ?? 'Unknown Employee',
                subtitle: [l.name],
              };

        return {
          id: l.employeeId,
          onPress: readonly ? undefined : () => onClick(l),
          leftSide,
          rightSide: {
            showChevron: !readonly,
            label: currencyFormatter(price),
          },
        };
      })}
    />
  );
}
