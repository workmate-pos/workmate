import { Money } from '@web/schemas/generated/create-work-order.js';
import { DiscriminatedUnionOmit } from '@work-orders/common/types/DiscriminatedUnionOmit.js';
import { CreateWorkOrderCharge } from '../screens/routes.js';
import { BigDecimal } from '@teifi-digital/shopify-app-toolbox/big-decimal';

export function getChargesPrice(
  labour: DiscriminatedUnionOmit<CreateWorkOrderCharge, 'employeeId' | 'lineItemUuid' | 'name' | 'chargeUuid'>[],
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