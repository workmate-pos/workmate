import { List, ListRowLeftSide, Stack, Text } from '@shopify/retail-ui-extensions-react';
import { ID } from '@web/schemas/generated/create-work-order.js';
import { DiscriminatedUnionOmit } from '@work-orders/common/types/DiscriminatedUnionOmit.js';
import { useEmployeeQueries } from '@work-orders/common/queries/use-employee-query.js';
import { getTotalPriceForCharges } from '../create-work-order/charges.js';
import { isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { useCurrencyFormatter } from '@work-orders/common-pos/hooks/use-currency-formatter.js';
import { CreateWorkOrderCharge } from '../types.js';

/**
 * A list of clickable EmployeeLabour items.
 */
export function EmployeeLabourList({
  labour,
  onClick,
  readonly = false,
}: {
  readonly?: boolean;
  labour: DiscriminatedUnionOmit<CreateWorkOrderCharge & { employeeId: ID }, 'workOrderItemUuid'>[];
  onClick: (labour: DiscriminatedUnionOmit<CreateWorkOrderCharge & { employeeId: ID }, 'workOrderItemUuid'>) => void;
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

        const price = getTotalPriceForCharges([l]);

        const leftSide: ListRowLeftSide =
          l.type === 'hourly-labour'
            ? {
                label: query?.data?.name ?? 'Unknown Employee',
                subtitle: [l.name, `${l.hours} hours × ${currencyFormatter(l.rate)}/hour`],
              }
            : {
                label: query?.data?.name ?? 'Unknown Employee',
                subtitle: [l.name, currencyFormatter(l.amount)],
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
