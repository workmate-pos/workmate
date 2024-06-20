import { CreateWorkOrder, Money } from '@web/schemas/generated/create-work-order.js';
import { DiscriminatedUnionOmit } from '@work-orders/common/types/DiscriminatedUnionOmit.js';
import { BigDecimal } from '@teifi-digital/shopify-app-toolbox/big-decimal';

export function getTotalPriceForCharges(
  charges: DiscriminatedUnionOmit<
    CreateWorkOrder['charges'][number],
    'employeeId' | 'workOrderItem' | 'name' | 'uuid' | 'amountLocked' | 'rateLocked' | 'hoursLocked' | 'removeLocked'
  >[],
): Money {
  return BigDecimal.sum(
    ...charges.map(l => {
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
