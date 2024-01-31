import { db } from '../db/db.js';
import { CreateWorkOrder } from '../../schemas/generated/create-work-order.js';
import { hasPropertyValue } from '@teifi-digital/shopify-app-toolbox/guards';
import { BigDecimal } from '@teifi-digital/shopify-app-toolbox/big-decimal';

export async function removeWorkOrderCharges(workOrderId: number) {
  await Promise.all([
    db.workOrderLabour.removeHourlyLabour({ workOrderId }),
    db.workOrderLabour.removeFixedPriceLabour({ workOrderId }),
  ]);
}

export async function createWorkOrderCharges(
  workOrderId: number,
  { charges, lineItems }: Pick<CreateWorkOrder, 'charges' | 'lineItems'>,
) {
  // doing these insertions in bulk is possible, but not worth the complexity (trust me i tried).
  // INSERT RETURNING is not guaranteed to return in input order, so we would need to restore the order somehow.
  // not worth the extra complexity since the number of items per work order is small anyway.

  const findProductVariantId = (lineItemUuid: string | null) =>
    lineItems.find(li => li.uuid === lineItemUuid)?.productVariantId ?? null;

  const hourlyLabour = charges.filter(hasPropertyValue('type', 'hourly-labour'));
  const fixedPriceLabour = charges.filter(hasPropertyValue('type', 'fixed-price-labour'));

  await Promise.all([
    ...hourlyLabour.map(({ name, lineItemUuid, employeeId, rate, hours }) =>
      db.workOrderLabour.insertHourlyLabour({
        productVariantId: findProductVariantId(lineItemUuid),
        rate: rate,
        lineItemUuid,
        workOrderId,
        employeeId,
        hours,
        name,
      }),
    ),
    ...fixedPriceLabour.map(({ name, lineItemUuid, amount, employeeId }) =>
      db.workOrderLabour.insertFixedPriceLabour({
        productVariantId: findProductVariantId(lineItemUuid),
        amount: amount,
        workOrderId,
        employeeId,
        lineItemUuid,
        name,
      }),
    ),
  ]);
}

export function getChargePrice(charge: CreateWorkOrder['charges'][number]) {
  switch (charge.type) {
    case 'hourly-labour':
      return BigDecimal.fromMoney(charge.rate).multiply(BigDecimal.fromDecimal(charge.hours)).toMoney();

    case 'fixed-price-labour':
      return charge.amount;

    default:
      return charge satisfies never;
  }
}
