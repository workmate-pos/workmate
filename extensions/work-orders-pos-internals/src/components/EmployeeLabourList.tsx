import { List, ListRowLeftSide, Stack, Text } from '@shopify/ui-extensions-react/point-of-sale';
import { ID } from '@web/schemas/generated/create-work-order.js';
import { DiscriminatedUnionOmit } from '@work-orders/common/types/DiscriminatedUnionOmit.js';
import { useEmployeeQueries } from '@work-orders/common/queries/use-employee-query.js';
import { isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { useCurrencyFormatter } from '@work-orders/common-pos/hooks/use-currency-formatter.js';
import { CreateWorkOrderCharge } from '../types.js';
import { useWorkOrderOrders } from '@work-orders/common/queries/use-work-order-orders.js';
import { useScreen } from '@teifi-digital/pos-tools/router';
import { getTotalPriceForCharges } from '@work-orders/common/create-work-order/charges.js';

/**
 * A list of clickable EmployeeLabour items.
 */
export function EmployeeLabourList({
  workOrderName,
  charges,
  onClick,
}: {
  workOrderName: string | null;
  charges: DiscriminatedUnionOmit<CreateWorkOrderCharge & { employeeId: ID }, 'workOrderItemUuid'>[];
  onClick: (labour: DiscriminatedUnionOmit<CreateWorkOrderCharge & { employeeId: ID }, 'workOrderItemUuid'>) => void;
}) {
  const currencyFormatter = useCurrencyFormatter();

  const fetch = useAuthenticatedFetch();
  const employeeQueries = useEmployeeQueries({ fetch, ids: charges.map(e => e.employeeId).filter(isNonNullable) });
  const { workOrderQuery, getChargeOrder } = useWorkOrderOrders({ fetch, workOrderName });

  const screen = useScreen();
  screen.setIsLoading(workOrderQuery.isLoading || Object.values(employeeQueries).some(q => q.isLoading));

  if (charges.length === 0) {
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
      data={charges.map(charge => {
        const query = employeeQueries[charge.employeeId];

        const price = getTotalPriceForCharges([charge]);

        const leftSide: ListRowLeftSide =
          charge.type === 'hourly-labour'
            ? {
                label: query?.data?.name ?? 'Unknown employee',
                subtitle: [charge.name, `${charge.hours} hours × ${currencyFormatter(charge.rate)}/hour`],
              }
            : {
                label: query?.data?.name ?? 'Unknown employee',
                subtitle: [charge.name, currencyFormatter(charge.amount)],
              };

        return {
          id: charge.employeeId,
          onPress: getChargeOrder(charge)?.type === 'ORDER' ? undefined : () => onClick(charge),
          leftSide: {
            ...leftSide,
            badges: [getChargeOrder(charge)]
              .filter(isNonNullable)
              .filter(order => order?.type === 'ORDER')
              .map(order => ({ text: order.name, variant: 'highlight' })),
          },
          rightSide: {
            showChevron: getChargeOrder(charge)?.type !== 'ORDER',
            label: currencyFormatter(price),
          },
        };
      })}
    />
  );
}
