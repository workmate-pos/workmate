import { db } from '../db/db.js';
import { CreateWorkOrder } from '../../schemas/generated/create-work-order.js';
import { parseMoney, toCents } from '@work-orders/common/util/money.js';

export async function removeWorkOrderLabour(workOrderId: number) {
  await Promise.all([
    db.workOrderLabour.removeHourlyLabour({ workOrderId }),
    db.workOrderLabour.removeFixedPriceLabour({ workOrderId }),
  ]);
}

export async function createWorkOrderLabour(
  workOrderId: number,
  { labour: { hourlyLabour, fixedPriceLabour }, lineItems }: Pick<CreateWorkOrder, 'labour' | 'lineItems'>,
) {
  // doing these insertions in bulk is possible, but not worth the complexity (trust me i tried).
  // INSERT RETURNING is not guaranteed to return in input order, so we would need to restore the order somehow.
  // not worth the extra complexity since the number of items per work order is small anyway.

  const findProductVariantId = (lineItemUuid: string | null) =>
    lineItems.find(li => li.uuid === lineItemUuid)?.productVariantId ?? null;

  await Promise.all([
    ...hourlyLabour.map(({ name, lineItemUuid, employeeId, rate, hours }) =>
      db.workOrderLabour.insertHourlyLabour({
        productVariantId: findProductVariantId(lineItemUuid),
        rate: toCents(parseMoney(rate)),
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
        amount: toCents(parseMoney(amount)),
        workOrderId,
        employeeId,
        lineItemUuid,
        name,
      }),
    ),
  ]);
}
