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
  charges,
  onClick,
  readonlyFixedPriceChargeUuids,
  readonlyHourlyChargeUuids,
}: {
  readonlyHourlyChargeUuids: string[];
  readonlyFixedPriceChargeUuids: string[];
  charges: DiscriminatedUnionOmit<CreateWorkOrderCharge & { employeeId: ID }, 'workOrderItemUuid'>[];
  onClick: (labour: DiscriminatedUnionOmit<CreateWorkOrderCharge & { employeeId: ID }, 'workOrderItemUuid'>) => void;
}) {
  const currencyFormatter = useCurrencyFormatter();

  const fetch = useAuthenticatedFetch();
  const employeeQueries = useEmployeeQueries({ fetch, ids: charges.map(e => e.employeeId).filter(isNonNullable) });

  if (charges.length === 0) {
    return (
      <Stack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
        <Text variant="body" color="TextSubdued">
          No employees assigned
        </Text>
      </Stack>
    );
  }

  function chargeIsReadonly(charge: Pick<CreateWorkOrderCharge, 'type' | 'uuid'> | null) {
    return (
      charge !== null &&
      ((charge.type === 'hourly-labour' && readonlyHourlyChargeUuids.includes(charge.uuid)) ||
        readonlyFixedPriceChargeUuids.includes(charge.uuid))
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
                label: query?.data?.name ?? 'Unknown Employee',
                subtitle: [charge.name, `${charge.hours} hours × ${currencyFormatter(charge.rate)}/hour`],
              }
            : {
                label: query?.data?.name ?? 'Unknown Employee',
                subtitle: [charge.name, currencyFormatter(charge.amount)],
              };

        return {
          id: charge.employeeId,
          onPress: chargeIsReadonly(charge) ? undefined : () => onClick(charge),
          leftSide,
          rightSide: {
            showChevron: !chargeIsReadonly(charge),
            label: currencyFormatter(price),
          },
        };
      })}
    />
  );
}
