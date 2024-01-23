import { Money } from '@web/schemas/generated/create-work-order.js';
import { DiscriminatedUnionOmit } from '@work-orders/common/types/DiscriminatedUnionOmit.js';
import { CreateWorkOrderLabour } from '../screens/routes.js';
import { BigDecimal } from '@teifi-digital/shopify-app-toolbox/big-decimal';

export function getLabourPrice(
  labour: DiscriminatedUnionOmit<CreateWorkOrderLabour, 'employeeId' | 'lineItemUuid' | 'name' | 'labourUuid'>[],
): Money {
  return BigDecimal.sum(
    ...labour.map(l => {
      if (l.type === 'hourly-labour') {
        return BigDecimal.fromDecimal(l.hours).multiply(BigDecimal.fromMoney(l.rate));
      }

      if (l.type === 'fixed-price-labour') {
        return BigDecimal.fromMoney(l.amount);
      }

      return l satisfies never;
    }),
  ).toMoney();
}
