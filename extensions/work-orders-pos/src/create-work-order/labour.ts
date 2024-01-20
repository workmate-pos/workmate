import { CreateWorkOrder, Money } from '@web/schemas/generated/create-work-order.js';
import { sum } from '@work-orders/common/util/array.js';
import { Cents, parseMoney, toCents, toDollars, toMoney } from '@work-orders/common/util/money.js';
import { DiscriminatedUnionOmit } from '@work-orders/common/types/DiscriminatedUnionOmit.js';
import { CreateWorkOrderLabour } from '../screens/routes.js';

export function getLabourPrice(
  labour: DiscriminatedUnionOmit<CreateWorkOrderLabour, 'employeeId' | 'lineItemUuid' | 'name' | 'labourUuid'>[],
): Money {
  return toMoney(
    toDollars(
      sum(labour, l => {
        if (l.type === 'hourly-labour') {
          return (l.hours * toCents(parseMoney(l.rate))) as Cents;
        }

        if (l.type === 'fixed-price-labour') {
          return toCents(parseMoney(l.amount));
        }

        return l satisfies never;
      }) as Cents,
    ),
  );
}
